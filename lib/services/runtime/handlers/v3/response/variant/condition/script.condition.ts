import { ScriptCondition as RawScriptCondition } from '../../response.types';
import { VariableContext } from '../../variableContext/variableContext';
import { BaseCondition } from './base.condition';

export class ScriptCondition extends BaseCondition {
  constructor(protected readonly rawCondition: RawScriptCondition, varContext: VariableContext) {
    super(rawCondition, varContext);
  }

  evaluate(): boolean {
    return false;
  }
}
