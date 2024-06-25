import ivm from 'isolated-vm';

export class ConditionIsolate {
  private isolate?: ivm.Isolate;

  private context?: ivm.Context;

  private static readonly userFunctionName = `userFunction`;

  private static readonly userModuleName = `userModule`;

  private static readonly userVariablesName = `inputVars`;

  private static readonly resolveFuncName = `__resolve__`;

  private static readonly rejectFuncName = `__reject__`;

  constructor(private readonly variables: Record<string, unknown>) {}

  private readonly ISOLATED_VM_LIMITS = {
    maxMemoryMB: 8,
    maxExecutionTimeMs: 1 * 1000,
  };

  private async setupResolve(resolve: (value: any) => void, reject: (reason?: any) => void) {
    await this.context!.evalClosure(
      `
            ${ConditionIsolate.resolveFuncName} = function(...args) {
                return $0.apply(undefined, args, { arguments: { copy: true }});
            }
            ${ConditionIsolate.rejectFuncName} = function(...args) {
                return $1.apply(undefined, args, { arguments: { copy: true }});
            }
        `,
      [resolve, reject],
      { arguments: { reference: true } }
    );
  }

  private async setupUserVariables() {
    await this.context!.global.set(ConditionIsolate.userVariablesName, this.variables, { copy: true });
  }

  private async compileUserModule(code: string) {
    return this.isolate!.compileModule(code);
  }

  private async compileMainModule() {
    const sanitizeVarsFromGlobal = `
            const ${ConditionIsolate.userVariablesName} = globalThis.${ConditionIsolate.userVariablesName};
            delete globalThis.${ConditionIsolate.userVariablesName};
        `;

    return this.isolate!.compileModule(`
        import ${ConditionIsolate.userFunctionName} from '${ConditionIsolate.userModuleName}';
        ${sanitizeVarsFromGlobal}
        (function () {
          try { 
            const result = ${ConditionIsolate.userFunctionName}({ ${ConditionIsolate.userVariablesName} });
            ${ConditionIsolate.resolveFuncName}(result);
          } catch (err) {
            ${ConditionIsolate.rejectFuncName}(err);
          }
        })();
      `);
  }

  public async initialize(): Promise<void> {
    this.isolate = new ivm.Isolate({
      memoryLimit: this.ISOLATED_VM_LIMITS.maxMemoryMB,
    });

    this.context = await this.isolate.createContext();

    await Promise.all(
      Object.entries(this.variables).map(([name, value]) => this.context?.global.set(name, value, { copy: true }))
    );
  }

  public async cleanup(): Promise<void> {
    this.context?.release();
    this.isolate?.dispose();
  }

  public async executeUserModule(code: string) {
    if (!this.isolate || !this.context) {
      throw new Error(`condition isolate was not initialized before an attempt to execute code`);
    }

    const userModule = await this.compileUserModule(code);
    const mainModule = await this.compileMainModule();
    await this.setupUserVariables();

    const executeCode = async (resolve: (val: unknown) => void, reject: (reason?: unknown) => void) => {
      try {
        await this.setupResolve(resolve, reject);

        await userModule.instantiate(this.context!, () => {
          throw new Error(`User code cannot import modules.`);
        });

        await mainModule.instantiate(this.context!, (specifier: string) => {
          if (specifier === ConditionIsolate.userModuleName) {
            return userModule;
          }
          throw new Error(`Module '${specifier}' does not exist.`);
        });

        await mainModule.evaluate({
          timeout: this.ISOLATED_VM_LIMITS.maxExecutionTimeMs,
        });
      } catch (err) {
        reject(err);
      }
    };

    return new Promise((resolve, reject) => {
      try {
        executeCode(resolve, reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async executeCode(code: string): Promise<unknown> {
    if (!this.context) {
      throw new Error(`condition isolate was not initialized before an attempt to execute code`);
    }
    return this.context.eval(code, {
      timeout: this.ISOLATED_VM_LIMITS.maxExecutionTimeMs,
    });
  }
}
