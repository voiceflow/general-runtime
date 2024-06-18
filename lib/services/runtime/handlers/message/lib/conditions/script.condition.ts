import { CompiledScriptCondition } from '@voiceflow/dtos';

import { BaseCondition } from './base.condition';

export class ScriptCondition extends BaseCondition<CompiledScriptCondition> {
  private evaluateCode(_code: string): boolean {
    throw new Error('script condition is not implemented');
  }

  public evaluate(): boolean {
    return this.evaluateCode(this.condition.data.code);
  }
}
