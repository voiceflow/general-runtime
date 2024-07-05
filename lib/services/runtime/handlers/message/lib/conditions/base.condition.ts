import { AnyCompiledCondition, CompiledConditionAssertion, ConditionOperation } from '@voiceflow/dtos';
import noop from 'lodash/noop';

import { AIModelParams, AIResponse } from '../../../utils/ai';

export type BaseConditionLogger = (message: string) => void;

export interface ConditionServices {
  llm: {
    generate: (prompt: string, settings: AIModelParams, maxTurns: number) => Promise<AIResponse>;
  };
}

export abstract class BaseCondition<Condition extends AnyCompiledCondition = AnyCompiledCondition> {
  constructor(
    protected readonly condition: Condition,
    protected readonly variables: Record<string, unknown>,
    protected readonly services: ConditionServices,
    protected readonly log: BaseConditionLogger = noop
  ) {}

  abstract evaluate(): Promise<boolean> | boolean;

  protected formatAssertion(assertion: CompiledConditionAssertion): string {
    return `${assertion.lhs} ${assertion.operation} ${assertion.rhs}`;
  }

  protected compileJITContains(lhs: string, rhs: string, negate: boolean) {
    const negateOperator = negate ? '!' : '';
    return `${negateOperator}String(${lhs}).toLowerCase().includes(String(${rhs}).toLowerCase())`;
  }

  protected compileJITSubstring(lhs: string, rhs: string, isStartsWith: boolean) {
    const methodName = isStartsWith ? `startsWith` : `endsWith`;
    return `String(${lhs}).toLowerCase().${methodName}(String(${rhs}).toLowerCase())`;
  }

  protected compileJITAssertion(assertion: CompiledConditionAssertion): string {
    switch (assertion.operation) {
      case ConditionOperation.CONTAINS:
      case ConditionOperation.NOT_CONTAINS:
        return this.compileJITContains(
          assertion.lhs,
          assertion.rhs,
          assertion.operation === ConditionOperation.NOT_CONTAINS
        );
      case ConditionOperation.STARTS_WITH:
      case ConditionOperation.ENDS_WITH:
        return this.compileJITSubstring(
          assertion.lhs,
          assertion.rhs,
          assertion.operation === ConditionOperation.STARTS_WITH
        );
      case ConditionOperation.GREATER_OR_EQUAL:
        return `${assertion.lhs} >= ${assertion.rhs}`;
      case ConditionOperation.GREATER_THAN:
        return `${assertion.lhs} > ${assertion.rhs}`;
      case ConditionOperation.LESS_OR_EQUAL:
        return `${assertion.lhs} <= ${assertion.rhs}`;
      case ConditionOperation.LESS_THAN:
        return `${assertion.lhs} < ${assertion.rhs}`;
      case ConditionOperation.IS:
        return `${assertion.lhs} == ${assertion.rhs}`;
      case ConditionOperation.IS_NOT:
        return `${assertion.lhs} != ${assertion.rhs}`;
      case ConditionOperation.IS_EMPTY:
        return `${assertion.lhs} == ''`;
      case ConditionOperation.IS_NOT_EMPTY:
        return `${assertion.lhs} != ''`;
      default:
        throw new Error(`expression condition received an unexpected operator "${assertion.operation}"`);
    }
  }
}
