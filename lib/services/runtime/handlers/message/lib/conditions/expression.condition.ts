import { replaceVariables } from '@voiceflow/common';
import { CompiledConditionAssertion, CompiledExpressionCondition, ConditionOperation } from '@voiceflow/dtos';

import { BaseCondition } from './base.condition';
import { ConditionIsolate } from './conditionIsolate';

export class ExpressionCondition extends BaseCondition<CompiledExpressionCondition> {
  private compileJITContains(lhs: string, rhs: string, negate: boolean) {
    const negateOperator = negate ? '!' : '';
    return `${negateOperator}String(${lhs}).toLowerCase().includes(String(${rhs}).toLowerCase())`;
  }

  private compileJITSubstring(lhs: string, rhs: string, isStartsWith: boolean) {
    const methodName = isStartsWith ? `startsWith` : `endsWith`;
    return `String(${lhs}).toLowerCase().${methodName}(String(${rhs}).toLowerCase())`;
  }

  private compileJITAssertion(assertion: CompiledConditionAssertion): string {
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

  private async evaluateAssertion(isolate: ConditionIsolate, assertion: CompiledConditionAssertion): Promise<boolean> {
    const resolvedAssertion = {
      ...assertion,
      lhs: replaceVariables(assertion.lhs, this.variables, JSON.stringify),
      rhs: replaceVariables(assertion.rhs, this.variables, JSON.stringify),
    };
    const result: unknown = await isolate.executeCode(this.compileJITAssertion(resolvedAssertion));
    return !!result;
  }

  private formatAssertion(assertion: CompiledConditionAssertion): string {
    return `${assertion.lhs} ${assertion.operation} ${assertion.rhs}`;
  }

  private async every(isolate: ConditionIsolate): Promise<boolean> {
    this.logToPrototype('--- evaluating expression, matchAll = true ---');

    const assertionResults = await Promise.all(
      this.condition.data.assertions.map((assert) => this.evaluateAssertion(isolate, assert))
    );
    const result = assertionResults.every(Boolean);

    this.logToPrototype(`--- evaluated expression, result = ${result} ---`);

    if (!result) {
      const firstFalse = assertionResults.findIndex((val) => !val);
      const assertion = this.condition.data.assertions[firstFalse];
      this.logToPrototype(`- assertion '${this.formatAssertion(assertion)}' was false`);
    }

    return result;
  }

  private async some(isolate: ConditionIsolate): Promise<boolean> {
    this.logToPrototype('--- evaluating expression, matchAll = false ---');

    const assertionResults = await Promise.all(
      this.condition.data.assertions.map((assert) => this.evaluateAssertion(isolate, assert))
    );
    const result = assertionResults.some(Boolean);

    this.logToPrototype(`--- evaluated expression, result = ${result}`);

    if (result) {
      const firstTrue = assertionResults.findIndex((val) => val);
      const assertion = this.condition.data.assertions[firstTrue];
      this.logToPrototype(`- assertion '${this.formatAssertion(assertion)}' was true`);
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
        this.logToObservability(
          `an unknown error occurred executing an expression condition, msg = ${err.message.substring(0, 200)}`
        );
      } else {
        this.logToObservability(
          `an unknown error occurred executing an expression condition, details = ${JSON.stringify(
            err,
            null,
            2
          ).substring(0, 200)}`
        );
      }

      this.logToPrototype(`expression condition encountered an unexpected error and automatically resolved to 'false'`);

      return false;
    } finally {
      isolate.cleanup();
    }
  }
}
