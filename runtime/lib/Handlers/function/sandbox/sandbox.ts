import ivm from 'isolated-vm';

import log from '@/logger';

import { stdlib } from './lib';
import { SandboxOptions, SandboxResult } from './sandbox.interface';
import { ExecutionContext } from './sandbox.types';

export class Sandbox {
  static async execute(
    code: string,
    variables: Record<string, unknown>,
    options: SandboxOptions
  ): Promise<SandboxResult> {
    const sandbox = new Sandbox(code, variables, options);
    return sandbox.execute();
  }

  private readonly memoryLimit = 10;

  private readonly sandboxTimeoutSec = 1;

  private readonly resolveFuncName = '__resolve__';

  private readonly rejectFuncName = '__reject__';

  private readonly userVariablesName = 'userVariables';

  private readonly userModuleName = 'userModule';

  private readonly userFunctionName = 'userFunction';

  private readonly shouldInjectLog: boolean = false;

  private constructor(
    private readonly code: string,
    private readonly variables: Record<string, unknown>,
    options: SandboxOptions
  ) {
    /**
     * Enable a `log` function when running `general-runtime` on development environments. Never
     * expose this to end-users.
     */
    this.shouldInjectLog = options.shouldEnableInject;
  }

  private async injectLog(context: ivm.Context) {
    if (this.shouldInjectLog) {
      await context.evalClosure(
        `
                log = function(obj) {
                    $0.applyIgnored(undefined, [obj], { arguments: { copy: true } });
                };
            `,
        [log.info],
        { arguments: { reference: true } }
      );
    }
  }

  private async injectFetch(context: ivm.Context) {
    return context.evalClosure(
      `
            fetch = function(...args) {
                return $0.apply(undefined, args, { arguments: { copy: true }, result: { promise: true, copy: true } });
            }
        `,
      [stdlib.Fetch.fetch],
      { arguments: { reference: true } }
    );
  }

  private async injectUserVariables(execContext: ExecutionContext) {
    await execContext.context.global.set(this.userVariablesName, this.variables, { copy: true });
  }

  private async compileUserCode(isolate: ivm.Isolate) {
    return isolate.compileModule(this.code);
  }

  private async setupResolve(
    execContext: ExecutionContext,
    resolve: (value: any) => void,
    reject: (reason?: any) => void
  ) {
    await execContext.context.evalClosure(
      `
            ${this.resolveFuncName} = function(...args) {
                return $0.apply(undefined, args, { arguments: { copy: true }});
            }
            ${this.rejectFuncName} = function(...args) {
                return $1.apply(undefined, args, { arguments: { copy: true }});
            }
        `,
      [resolve, reject],
      { arguments: { reference: true } }
    );
  }

  private async setupMainModule(execContext: ExecutionContext) {
    await this.injectUserVariables(execContext);

    const sanitizeVarsFromGlobal = `
            const ${this.userVariablesName} = globalThis.${this.userVariablesName};
            delete globalThis.${this.userVariablesName};
        `;

    const mainModule = await execContext.isolate.compileModule(`
            import ${this.userFunctionName} from '${this.userModuleName}';

            ${sanitizeVarsFromGlobal}

            (async function () {
                try {
                    const result = await ${this.userFunctionName}(${this.userVariablesName});
                    ${this.resolveFuncName}(result);
                } catch (err) {
                    ${this.rejectFuncName}(err);
                }
            })();
        `);

    await mainModule.instantiate(execContext.context, (specifier, _referrer) => {
      if (specifier === this.userModuleName) {
        return execContext.userCodeModule;
      }
      throw new Error(`Module '${specifier}' does not exist.`);
    });

    return mainModule;
  }

  private async executeUserCode(execContext: ExecutionContext) {
    const executeCode = async (resolve: (val: any) => void, reject: (reason?: any) => void) => {
      await this.setupResolve(execContext, resolve, reject);

      const mainModule = await this.setupMainModule(execContext);

      await mainModule.evaluate({
        timeout: this.sandboxTimeoutSec,
        promise: true,
      });
    };

    return new Promise((resolve, reject) => {
      try {
        executeCode(resolve, reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  private isValidResult(result: unknown): result is SandboxResult {
    if (!result) {
      return false;
    }
    if (typeof result !== 'object') {
      return false;
    }

    const returnObj: Record<string, any> = result;

    if (returnObj.port && typeof returnObj.port !== 'string') {
      return false;
    }

    if (returnObj.output && typeof returnObj.output !== 'object') {
      return false;
    }

    return true;
  }

  private async execute(): Promise<SandboxResult> {
    const isolate = new ivm.Isolate({ memoryLimit: this.memoryLimit });
    const context = await isolate.createContext();

    await this.injectFetch(context);
    await this.injectLog(context);

    const userCodeModule = await this.compileUserCode(isolate);

    const result = await this.executeUserCode({ isolate, context, userCodeModule });

    if (!this.isValidResult(result)) {
      throw new Error("Function step's code returned an invalid response body");
    }

    return result;
  }
}
