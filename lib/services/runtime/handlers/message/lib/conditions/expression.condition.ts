import { CompiledConditionAssertion, CompiledExpressionCondition, ConditionOperation } from '@voiceflow/dtos';

import { BaseCondition } from './base.condition';
import { ConditionIsolate } from './conditionIsolate';

export class ExpressionCondition extends BaseCondition<CompiledExpressionCondition> {
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
        throw new Error(`expression condition received an unexpected operator "${assertion.operation}"`);
    }
  }

  private async evaluateAssertion(isolate: ConditionIsolate, assertion: CompiledConditionAssertion): Promise<boolean> {
    const result: unknown = await isolate.executeCode(this.compileJITAssertion(assertion));
    return !!result;
  }

  private formatAssertion(assertion: CompiledConditionAssertion): string {
    return `${assertion.lhs} ${assertion.operation} ${assertion.rhs}`;
  }

  private async every(isolate: ConditionIsolate): Promise<boolean> {
    this.runtime.trace.debug('--- evaluating expression, matchAll = true ---');

    const assertionResults = await Promise.all(
      this.condition.data.assertions.map((assert) => this.evaluateAssertion(isolate, assert))
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

  private async some(isolate: ConditionIsolate): Promise<boolean> {
    this.runtime.trace.debug('--- evaluating expression, matchAll = false ---');

    const assertionResults = await Promise.all(
      this.condition.data.assertions.map((assert) => this.evaluateAssertion(isolate, assert))
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

  public async evaluate(): Promise<boolean> {
    const isolate = new ConditionIsolate(this.variables);
    try {
      await isolate.initialize();

      // WARNING - Must explicitly await the code execution, otherwise, isolate cleanup in `finally`
      //           executes before the evaluated condition is fully computed.
      return await (this.condition.data.matchAll ? this.every(isolate) : this.some(isolate));
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`an error occurred executing an expression condition, msg = ${err.message}`);
      }
      throw new Error(
        `an unknown error occurred executing an expression condition, details = ${JSON.stringify(
          err,
          null,
          2
        ).substring(0, 300)}`
      );
    } finally {
      isolate.cleanup();
    }
  }
}
