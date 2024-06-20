import { CompiledScriptCondition } from '@voiceflow/dtos';

import { BaseCondition } from './base.condition';
import { ConditionIsolate } from './conditionIsolate';

export class ScriptCondition extends BaseCondition<CompiledScriptCondition> {
  private async evaluateCode(isolate: ConditionIsolate, code: string): Promise<boolean> {
    const result = await isolate.executeCode(code);
    return !!result;
  }

  public async evaluate(): Promise<boolean> {
    const isolate = new ConditionIsolate(this.variables);
    try {
      return await this.evaluateCode(isolate, this.condition.data.code);
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`an error occurred executing an script condition, msg = ${err.message}`);
      }
      throw new Error(
        `an unknown error occurred executing an script condition, details = ${JSON.stringify(err, null, 2).substring(
          0,
          300
        )}`
      );
    } finally {
      isolate.cleanup();
    }
  }
}
