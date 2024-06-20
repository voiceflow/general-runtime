import ivm from 'isolated-vm';

export class ConditionIsolate {
  private isolate?: ivm.Isolate;

  private context?: ivm.Context;

  private static readonly userFunctionName = `userFunction`;

  private static readonly userModuleName = `userModule`;

  private static readonly userVariablesName = `inputVars`;

  constructor(private readonly variables: Record<string, unknown>) {}

  private readonly ISOLATED_VM_LIMITS = {
    maxMemoryMB: 8,
    maxExecutionTimeMs: 1 * 1000,
  };

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

    const userModule = await this.isolate.compileModule(code);
    await userModule.instantiate(this.context, () => {
      throw new Error(`User code cannot import modules.`);
    });

    this.context.global.set(ConditionIsolate.userVariablesName, this.variables, { copy: true });

    const sanitizeVarsFromGlobal = `
            const ${ConditionIsolate.userVariablesName} = globalThis.${ConditionIsolate.userVariablesName};
            delete globalThis.${ConditionIsolate.userVariablesName};
        `;

    const mainModule = await this.isolate.compileModule(`
      import userFunction from '.'
      ${sanitizeVarsFromGlobal}
      (function () {
        return ${ConditionIsolate.userFunctionName}({ ${ConditionIsolate.userVariablesName} });
      })();
    `);

    await mainModule.instantiate(this.context, (specifier: string) => {
      if (specifier === ConditionIsolate.userModuleName) {
        return userModule;
      }
      throw new Error(`Module '${specifier}' does not exist.`);
    });

    return mainModule.evaluate({
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
