import VError from '@voiceflow/verror';

import { ConditionType, ResolvedCondition } from '../../response.types';
import { VariableContext } from '../../variableContext/variableContext';
import { BaseCondition } from './base.condition';
import { ExpressionCondition } from './expression.condition';
import { PromptCondition } from './prompt.condition';
import { ScriptCondition } from './script.condition';

export function buildCondition(rawCondition: ResolvedCondition, varContext: VariableContext): BaseCondition {
  switch (rawCondition.type) {
    case ConditionType.PROMPT:
      return new PromptCondition(rawCondition, varContext);
    case ConditionType.EXPRESSION:
      return new ExpressionCondition(rawCondition, varContext);
    case ConditionType.SCRIPT:
      return new ScriptCondition(rawCondition, varContext);
    default:
      throw new VError('unknown condition type encountered');
  }
}
