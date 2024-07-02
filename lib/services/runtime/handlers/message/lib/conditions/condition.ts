import { AnyCompiledCondition, ConditionType } from '@voiceflow/dtos';

import { BaseCondition, BaseConditionLogger, ConditionServices } from './base.condition';
import { ExpressionCondition } from './expression.condition';
import { PromptCondition } from './prompt.condition';
import { ScriptCondition } from './script.condition';

export function createCondition(
  condition: AnyCompiledCondition,
  variables: Record<string, unknown>,
  services: ConditionServices,
  log?: BaseConditionLogger
): BaseCondition {
  switch (condition.type) {
    case ConditionType.EXPRESSION:
      return new ExpressionCondition(condition, variables, services, log);
    case ConditionType.SCRIPT:
      return new ScriptCondition(condition, variables, services, log);
    case ConditionType.PROMPT:
      return new PromptCondition(condition, variables, services, log);
    default:
      throw new Error(`received unexpected condition type`);
  }
}
