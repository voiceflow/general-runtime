import { AnyCompiledCondition, ConditionType } from '@voiceflow/dtos';

import { Runtime, Store } from '@/runtime';

import { BaseCondition } from './base.condition';
import { ConditionResources } from './conditionResources';
import { ExpressionCondition } from './expression.condition';
import { ScriptCondition } from './script.condition';

export function createCondition(
  condition: AnyCompiledCondition,
  runtime: Runtime,
  variables: Store,
  resources: ConditionResources
): BaseCondition {
  switch (condition.type) {
    case ConditionType.EXPRESSION:
      return new ExpressionCondition(condition, runtime, variables, resources);
    case ConditionType.SCRIPT:
      return new ScriptCondition(condition, runtime, variables, resources);
    default:
      throw new Error('[createCondition]: received unexpected condition type');
  }
}
