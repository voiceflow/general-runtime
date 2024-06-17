import { CompiledConditionAssertion, CompiledExpressionCondition, ConditionOperation } from '@voiceflow/dtos';

import { BaseCondition } from './base.condition';
import { ConditionIsolate } from './conditionIsolate';

export class ExpressionCondition extends BaseCondition<CompiledExpressionCondition> {
  private isolate: ConditionIsolate | null = null;

  private compileJITAssertion(assertion: CompiledConditionAssertion): string {
    switch (assertion.operation) {
      case ConditionOperation.CONTAINS:
        return `String(${assertion.lhs}).toLowerCase().includes(String(${assertion.rhs}).toLowerCase())`;
      case ConditionOperation.NOT_CONTAINS:
        return `!(String(${assertion.lhs}).toLowerCase().includes(String(${assertion.rhs}).toLowerCase()))`;
      case ConditionOperation.STARTS_WITH:
        return `String(${assertion.lhs}).toLowerCase().startsWith(String(${assertion.rhs}).toLowerCase())`;
      case ConditionOperation.ENDS_WITH:
        return `String(${assertion.lhs}).toLowerCase().endsWith(String(${assertion.rhs}).toLowerCase())`;
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
        return `${assertion.lhs} == 0`;
      case ConditionOperation.IS_NOT_EMPTY:
        return `${assertion.lhs} != 0`;
      default:
        throw new Error('expression condition received an unexpected operator');
    }
  }

  private async evaluateAssertion(assertion: CompiledConditionAssertion): Promise<boolean> {
    if (!this.isolate) {
      throw new Error('expected isolate to be initialized in expression condition but it was not');
    }
    const result: unknown = await this.isolate.executeCode(this.compileJITAssertion(assertion));
    return !!result;
  }

  private formatAssertion(assertion: CompiledConditionAssertion): string {
    return `${assertion.lhs} ${assertion.operation} ${assertion.rhs}`;
  }

  private async every(): Promise<boolean> {
    this.runtime.trace.debug('--- evaluating expression, matchAll = true ---');

    const assertionResults = await Promise.all(
      this.condition.data.assertions.map((assert) => this.evaluateAssertion(assert))
    );
    const result = assertionResults.every((val) => val);

    this.runtime.trace.debug(`--- evaluated expression, result = ${result} ---`);

    if (!result) {
      const firstFalse = assertionResults.findIndex((val) => !val);
      const assertion = this.condition.data.assertions[firstFalse];
      this.runtime.trace.debug(`- assertion '${this.formatAssertion(assertion)}' was false`);
    }

    return result;
  }

  private async some(): Promise<boolean> {
    this.runtime.trace.debug('--- evaluating expression, matchAll = false ---');

    const assertionResults = await Promise.all(
      this.condition.data.assertions.map((assert) => this.evaluateAssertion(assert))
    );
    const result = assertionResults.some((val) => val);

    this.runtime.trace.debug(`--- evaluated expression, result = ${result}`);

    if (result) {
      const firstTrue = assertionResults.findIndex((val) => val);
      const assertion = this.condition.data.assertions[firstTrue];
      this.runtime.trace.debug(`- assertion '${this.formatAssertion(assertion)}' was true`);
    }

    return result;
  }

  async evaluate(): Promise<boolean> {
    this.isolate = new ConditionIsolate(this.variables);
    return this.condition.data.matchAll ? this.every() : this.some();
  }
}
