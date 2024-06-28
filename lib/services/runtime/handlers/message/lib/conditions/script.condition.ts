import { CompiledScriptCondition } from '@voiceflow/dtos';

import { BaseCondition } from './base.condition';
import { ConditionIsolate } from './conditionIsolate';

export class ScriptCondition extends BaseCondition<CompiledScriptCondition> {
  private async evaluateCode(isolate: ConditionIsolate, code: string): Promise<boolean> {
    const result = await isolate.executeUserModule(code);
    return !!result;
  }

  public async evaluate(): Promise<boolean> {
    this.log('--- evaluating script ---');

    const isolate = new ConditionIsolate(this.variables);
    try {
      await isolate.initialize();
      const result = await this.evaluateCode(isolate, this.condition.data.code);

      this.log(`--- script evaluated to ${result} ---`);

      return result;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`an error occurred executing a script condition, msg = ${err.message}`);
      }
      throw new Error(
        `an unknown error occurred executing a script condition, details = ${JSON.stringify(err, null, 2).substring(
          0,
          300
        )}`
      );
    } finally {
      isolate.cleanup();
    }
  }
}
