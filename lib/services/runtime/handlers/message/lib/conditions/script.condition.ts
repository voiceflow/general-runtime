import { CompiledScriptCondition } from '@voiceflow/dtos';

import { BaseCondition } from './base.condition';
import { ConditionIsolate } from './conditionIsolate';

export class ScriptCondition extends BaseCondition<CompiledScriptCondition> {
  private async evaluateCode(isolate: ConditionIsolate, code: string): Promise<boolean> {
    const result = await isolate.executeFunction(code);

    this.emitTraceMessage(`Script for condition returned value '${JSON.stringify(result)}'`);

    return !!result;
  }

  public async evaluate(): Promise<boolean> {
    const isolate = new ConditionIsolate(this.variables);
    try {
      await isolate.initialize();
      return await this.evaluateCode(isolate, this.condition.data.code);
    } catch (err) {
      if (err instanceof Error) {
        this.logError(`an error occurred executing a script condition, msg = ${err.message}`);
      } else {
        this.logError(
          `an unknown error occurred executing a script condition, details = ${JSON.stringify(err, null, 2).substring(
            0,
            300
          )}`
        );
      }

      this.emitTraceMessage(`Script condition encountered an unexpected error and automatically resolved to 'false'`);

      return false;
    } finally {
      isolate.cleanup();
    }
  }
}
