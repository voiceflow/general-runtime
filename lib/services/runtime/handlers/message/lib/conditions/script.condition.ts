import { CompiledScriptCondition } from '@voiceflow/dtos';

import { BaseCondition } from './base.condition';
import { ConditionIsolate } from './conditionIsolate';

export class ScriptCondition extends BaseCondition<CompiledScriptCondition> {
  private async evaluateCode(isolate: ConditionIsolate, code: string): Promise<boolean> {
    const result = await isolate.executeFunctionOrScript(code);

    if (result !== true && result !== false) {
      this.emitTraceMessage(`Script for condition returned value '${JSON.stringify(result)}'`);
    }

    return !!result;
  }

  public async evaluate(): Promise<boolean> {
    const isolate = new ConditionIsolate(this.variables);
    try {
      await isolate.initialize();
      return await this.evaluateCode(isolate, this.condition.data.code);
    } catch (err) {
      const errMessage =
        err instanceof Error
          ? `Script condition encountered an error and automatically resolved to 'false'. Details: ${err.message}`
          : `Script condition encountered an unexpected error and automatically resolved to 'false'. Details: ${JSON.stringify(
              err,
              null,
              2
            ).substring(0, 300)}`;

      this.logError(errMessage);
      this.emitTraceMessage(errMessage);

      return false;
    } finally {
      isolate.cleanup();
    }
  }
}
