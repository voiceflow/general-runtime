import { AnyCompiledCondition, CompiledConditionAssertion, ConditionOperation } from '@voiceflow/dtos';
import noop from 'lodash/noop';

import { AIModelParams, AIResponse } from '../../../utils/ai';

export type BaseConditionLogger = (message: string) => void;

export interface ConditionServices {
  llm: {
    generate: (prompt: string, settings: AIModelParams) => Promise<AIResponse>;
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
    return `${this.parseValue(assertion.lhs)} ${assertion.operation} ${this.parseValue(assertion.rhs)}`;
  }

  protected parseValue(value: string) {
    if (value === 'true' || value === 'false' || value === 'null') {
      // If value is a `boolean` or `null`, then we embed this value into the code string without modification
      return value;
    }
    if (Number.isNaN(parseFloat(value))) {
      // If `value` is neither `number` nor `boolean`, then embed it as a `string``.
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    // If value is `number`, then we should directly embed this value into the code string without modification
    return value;
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
    const parsedLHS = this.parseValue(assertion.lhs);
    const parsedRHS = this.parseValue(assertion.rhs);
    switch (assertion.operation) {
      case ConditionOperation.CONTAINS:
      case ConditionOperation.NOT_CONTAINS:
        return this.compileJITContains(parsedLHS, parsedRHS, assertion.operation === ConditionOperation.NOT_CONTAINS);
      case ConditionOperation.STARTS_WITH:
      case ConditionOperation.ENDS_WITH:
        return this.compileJITSubstring(parsedLHS, parsedRHS, assertion.operation === ConditionOperation.STARTS_WITH);
      case ConditionOperation.GREATER_OR_EQUAL:
        return `${parsedLHS} >= ${parsedRHS}`;
      case ConditionOperation.GREATER_THAN:
        return `${parsedLHS} > ${parsedRHS}`;
      case ConditionOperation.LESS_OR_EQUAL:
        return `${parsedLHS} <= ${parsedRHS}`;
      case ConditionOperation.LESS_THAN:
        return `${parsedLHS} < ${parsedRHS}`;
      case ConditionOperation.IS:
        return `${parsedLHS} == ${parsedRHS}`;
      case ConditionOperation.IS_NOT:
        return `${parsedLHS} != ${parsedRHS}`;
      case ConditionOperation.IS_EMPTY:
        return `${parsedLHS} == ''`;
      case ConditionOperation.IS_NOT_EMPTY:
        return `${parsedLHS} != ''`;
      default:
        throw new Error(`expression condition received an unexpected operator "${assertion.operation}"`);
    }
  }
}
