import { PromptCondition as RawPromptCondition } from '../../response.types';
import { VariableContext } from '../../variableContext/variableContext';
import { BaseCondition } from './base.condition';

export class PromptCondition extends BaseCondition {
  constructor(protected readonly rawCondition: RawPromptCondition, varContext: VariableContext) {
    super(rawCondition, varContext);
  }

  evaluate(): boolean {
    return false;
  }
}
