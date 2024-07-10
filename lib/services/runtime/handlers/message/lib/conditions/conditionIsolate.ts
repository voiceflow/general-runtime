import ivm from 'isolated-vm';

export class ConditionIsolate {
  private isolate?: ivm.Isolate;

  private context?: ivm.Context;

  private static readonly userFunctionName = `userFunction`;

  private static readonly userModuleName = `userModule`;

  private static readonly userVariablesName = `variables`;

  private static readonly resolveFuncName = `__resolve__`;

  private static readonly rejectFuncName = `__reject__`;

  private static readonly userConditionName = `condition`;

  constructor(private readonly variables: Record<string, unknown>) {}

  private readonly ISOLATED_VM_LIMITS = {
    maxMemoryMB: 8,
    maxExecutionTimeMs: 1 * 1000,
  };

  /**
   * Given the `resolve` and `reject` function instantiated by a `Promise` constructor, injects
   * these functions into the `isolated-vm` environment as a proxied function. The `isolated-vm`
   * entrypoint module will propagate values outside the sandbox through the `resolve` function,
   * it does the same for thrown exceptions with the `reject` function
   */
  private async setupResolve(resolve: (value: any) => void, reject: (reason?: any) => void) {
    if (!this.context) {
      throw new Error('sandbox did not initialize context');
    }

    await this.context.evalClosure(
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

  /**
   * Injects all given user variables into the execution environment.
   */
  private async setupUserVariables() {
    if (!this.context) {
      throw new Error('sandbox did not initialize context');
    }
    await this.context.global.set(ConditionIsolate.userVariablesName, this.variables, { copy: true });
  }

  /**
   * Compiles user-submitted code into an ESM module, which is later imported and executed by the
   * entrypoint module
   * @param code User-submitted code
   * @returns `ivm.Module` containing the user code
   */
  private async compileUserModule(code: string) {
    if (!this.isolate) {
      throw new Error('sandbox did not initialize isolate');
    }
    return this.isolate.compileModule(code);
  }

  /**
   * Compiles the entrypoint module, which imports the default member of the user code module, executes
   * it, and propagates the return value outside the sandbox using `resolve()`.
   * @returns
   */
  private async compileMainModule() {
    if (!this.isolate) {
      throw new Error('sandbox did not initialize isolate');
    }

    // Injects user variables into `globalThis`
    await this.setupUserVariables();

    // Removes injected user variables from the `globalThis` object t clean the namespace and avoid
    // user variables from being accessible from user code through `globalThis`.
    const sanitizeVarsFromGlobal = `
            const ${ConditionIsolate.userVariablesName} = globalThis.${ConditionIsolate.userVariablesName};
            delete globalThis.${ConditionIsolate.userVariablesName};
        `;

    return this.isolate.compileModule(`
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
    const userModule = await this.compileUserModule(code);
    const mainModule = await this.compileMainModule();

    const executeCode = async (resolve: (value: unknown) => void, reject: (value: unknown) => void) => {
      try {
        if (!this.context) {
          throw new Error(`condition isolate was not initialized before an attempt to execute code`);
        }

        // Inject the `Promise`'s resolve and reject functions as proxied functions in the sandbox
        await this.setupResolve(resolve, reject);

        // Forbid user-submitted code from importing any modules
        await userModule.instantiate(this.context, () => {
          throw new Error(`User code cannot import modules.`);
        });

        // Allow entrypoint module to import the user-submitted code.
        await mainModule.instantiate(this.context, (specifier: string) => {
          if (specifier === ConditionIsolate.userModuleName) {
            return userModule;
          }
          throw new Error(`Module '${specifier}' does not exist.`);
        });

        // Execute the entrypoint code, which executes the user-submitted code. When the user-submitted
        // code returns or throws, we push the result into the injected `resolve()` or the exception
        // into the injected `reject()`.
        await mainModule.evaluate({
          timeout: this.ISOLATED_VM_LIMITS.maxExecutionTimeMs,
        });
      } catch (err) {
        // Required to propagate thrown exceptions in this executor callback into the scope that
        // instantiated the `Promise`.
        reject(err);
      }
    };

    return new Promise((resolve, reject) => {
      executeCode(resolve, reject);
    });
  }

  public async executeFunction(code: string): Promise<unknown> {
    await this.setupUserVariables();

    const sanitizeVarsFromGlobal = `
        const ${ConditionIsolate.userVariablesName} = globalThis.${ConditionIsolate.userVariablesName};
        delete globalThis.${ConditionIsolate.userVariablesName};
    `;

    const completeCode = `
      ${sanitizeVarsFromGlobal}

      function condition({ variables }) {
        ${code}
      }

      ${ConditionIsolate.userConditionName}({ variables })
    `;

    return this.context?.eval(completeCode, {
      timeout: this.ISOLATED_VM_LIMITS.maxExecutionTimeMs,
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
