import { AnyCompiledCondition, ConditionType } from '@voiceflow/dtos';

import { Runtime, Store } from '@/runtime';

import { BaseCondition } from './base.condition';
import { ExpressionCondition } from './expression.condition';
import { PromptCondition } from './prompt.condition';
import { ScriptCondition } from './script.condition';

export function createCondition(condition: AnyCompiledCondition, runtime: Runtime, variables: Store): BaseCondition {
  switch (condition.type) {
    case ConditionType.EXPRESSION:
      return new ExpressionCondition(condition, runtime, variables);
    case ConditionType.SCRIPT:
      return new ScriptCondition(condition, runtime, variables);
    case ConditionType.PROMPT:
      return new PromptCondition(condition, runtime, variables);
    default:
      throw new Error(`received unexpected condition type`);
  }
}
