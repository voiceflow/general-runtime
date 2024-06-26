import { CompiledConditionAssertion, CompiledExpressionCondition } from '@voiceflow/dtos';

import { BaseCondition } from './base.condition';
import { ConditionIsolate } from './conditionIsolate';

export class ExpressionCondition extends BaseCondition<CompiledExpressionCondition> {
  private async evaluateAssertion(isolate: ConditionIsolate, assertion: CompiledConditionAssertion): Promise<boolean> {
    const result: unknown = await isolate.executeCode(this.compileJITAssertion(assertion));
    return !!result;
  }

  private async every(isolate: ConditionIsolate): Promise<boolean> {
    this.log('--- evaluating expression, matchAll = true ---');

    const assertionResults = await Promise.all(
      this.condition.data.assertions.map((assert) => this.evaluateAssertion(isolate, assert))
    );
    const result = assertionResults.every(Boolean);

    this.log(`--- evaluated expression, result = ${result} ---`);

    if (!result) {
      const firstFalse = assertionResults.findIndex((val) => !val);
      const assertion = this.condition.data.assertions[firstFalse];
      this.log(`- assertion '${this.formatAssertion(assertion)}' was false`);
    }

    return result;
  }

  private async some(isolate: ConditionIsolate): Promise<boolean> {
    this.log('--- evaluating expression, matchAll = false ---');

    const assertionResults = await Promise.all(
      this.condition.data.assertions.map((assert) => this.evaluateAssertion(isolate, assert))
    );
    const result = assertionResults.some(Boolean);

    this.log(`--- evaluated expression, result = ${result}`);

    if (result) {
      const firstTrue = assertionResults.findIndex((val) => val);
      const assertion = this.condition.data.assertions[firstTrue];
      this.log(`- assertion '${this.formatAssertion(assertion)}' was true`);
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
