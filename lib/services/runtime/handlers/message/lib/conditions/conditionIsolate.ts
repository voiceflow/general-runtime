import ivm from 'isolated-vm';

import { Store } from '@/runtime';

export class ConditionIsolate {
  private isolate?: ivm.Isolate;

  private context?: ivm.Context;

  constructor(private readonly variables: Store) {}

  private readonly ISOLATED_VM_LIMITS = {
    maxMemoryMB: 10,
    maxExecutionTimeMs: 1 * 1000,
  };

  async initialize() {
    this.isolate = new ivm.Isolate({
      memoryLimit: this.ISOLATED_VM_LIMITS.maxMemoryMB,
    });

    this.context = await this.isolate.createContext();

    await Promise.all(
      Object.keys(this.variables).map(async (key) => {
        await this.context!.global.set(key, this.variables.get(key), {
          copy: true,
        });
      })
    );
  }

  async cleanup() {
    this.context?.release();
    this.isolate?.dispose();
  }

  async executeCode(code: string) {
    if (!this.context) {
      throw new Error(`condition isolate was not initialized before an attempt to execute code`);
    }
    return this.context.eval(code, {
      timeout: this.ISOLATED_VM_LIMITS.maxExecutionTimeMs,
    });
  }
}
