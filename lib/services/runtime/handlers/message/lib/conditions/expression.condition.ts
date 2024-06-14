import { CompiledConditionAssertion, CompiledExpressionCondition } from '@voiceflow/dtos';
import { NotImplementedException } from '@voiceflow/exception';

import { BaseCondition } from './base.condition';

export class ExpressionCondition extends BaseCondition<CompiledExpressionCondition> {
  private evaluateAssertion(_assertion: CompiledConditionAssertion): boolean {
    // 1 - Substitute variables in lhs, rhs
    // 2 - Execute JavaScript `eval()` on lhs, rhs
    // 3 - Execute boolean operand
    // 4 - Return result
    this.runtime.trace.debug('--- evaluated assertion --- assertion = [], arguments = [], evaluated to true');
    throw new NotImplementedException('expression condition is not implemented');
  }

  every(): boolean {
    this.runtime.trace.debug('--- evaluating expression, matchAll = true ---');

    const result = this.condition.data.assertions.every((assert) => this.evaluateAssertion(assert));

    this.runtime.trace.debug('--- evaluated expression, result = true');

    return result;
  }

  some(): boolean {
    this.runtime.trace.debug('--- evaluating expression, matchAll = false ---');

    const firstTrueAssertion = this.condition.data.assertions.find((assert) => this.evaluateAssertion(assert));

    this.runtime.trace.debug(
      `--- evaluated expression, result = ${!firstTrueAssertion}${!firstTrueAssertion}` ? `, assertion = {}` : ''
    );

    return !firstTrueAssertion;
  }

  evaluate(): boolean {
    return this.condition.data.matchAll ? this.every() : this.some();
  }
}
