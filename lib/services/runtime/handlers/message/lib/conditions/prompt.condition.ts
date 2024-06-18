import { CompiledPromptCondition } from '@voiceflow/dtos';

import { BaseCondition } from './base.condition';

export class PromptCondition extends BaseCondition<CompiledPromptCondition> {
  public evaluate(): boolean {
    throw new Error('prompt condition is not implemented');
  }
}
