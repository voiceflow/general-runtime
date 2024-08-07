import ivm from 'isolated-vm';

export class ConditionIsolate {
  private isolate?: ivm.Isolate;

  private context?: ivm.Context;

  private static readonly userVariablesName = `variables`;

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

  public async executeFunctionOrScript(code: string): Promise<unknown> {
    const functionBody = `
      const { ${ConditionIsolate.userVariablesName} } = $0;
      try {
        // evaluate 'code' as though it's a top-level script and get last evaluated value
        return eval(${JSON.stringify(code)});
      } catch (err) {
        // evaluate 'code' as though it's the function body and execute it within a function
        if (err.message.includes('Illegal return statement')) {
          return eval(\`
            function main() {
              ${code}
            }
            main()
          \`)
        }
        throw err;
      }
    `;

    return this.context?.evalClosure(functionBody, [{ [ConditionIsolate.userVariablesName]: this.variables }], {
      timeout: this.ISOLATED_VM_LIMITS.maxExecutionTimeMs,
      arguments: { copy: true },
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
