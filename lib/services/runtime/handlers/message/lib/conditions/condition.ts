import { AnyCompiledCondition, ConditionType } from '@voiceflow/dtos';

import { BaseCondition, BaseConditionLogger } from './base.condition';
import { ScriptCondition } from './script.condition';
import { ValueVariableCondition } from './value-variable.condition';

export function createCondition(
  condition: AnyCompiledCondition,
  variables: Record<string, unknown>,
  log?: BaseConditionLogger,
  onError?: BaseConditionLogger
): BaseCondition {
  switch (condition.type) {
    case ConditionType.VALUE_VARIABLE:
      return new ValueVariableCondition(condition, variables, log, onError);
    case ConditionType.SCRIPT:
      return new ScriptCondition(condition, variables, log, onError);
    default:
      throw new Error(`received unexpected condition type`);
  }
}
