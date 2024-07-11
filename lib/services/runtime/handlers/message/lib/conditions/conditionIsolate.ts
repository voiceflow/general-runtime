import ivm from 'isolated-vm';

export class ConditionIsolate {
  private isolate?: ivm.Isolate;

  private context?: ivm.Context;

  private static readonly userVariablesName = `variables`;

  private static readonly userConditionName = `condition`;

  constructor(private readonly variables: Record<string, unknown>) {}

  private readonly ISOLATED_VM_LIMITS = {
    maxMemoryMB: 8,
    maxExecutionTimeMs: 1 * 1000,
  };

  /**
   * Injects all given user variables into the execution environment.
   */
  private async setupUserVariables() {
    if (!this.context) {
      throw new Error('sandbox did not initialize context');
    }
    await this.context.global.set(ConditionIsolate.userVariablesName, this.variables, { copy: true });
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
