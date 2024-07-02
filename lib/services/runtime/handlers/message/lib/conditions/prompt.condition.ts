import { CompiledConditionPredicate, CompiledPromptCondition } from '@voiceflow/dtos';

import { BaseCondition } from './base.condition';
import { ConditionIsolate } from './conditionIsolate';

export class PromptCondition extends BaseCondition<CompiledPromptCondition> {
  private parseValue(value: string) {
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

  private formatPredicate(assertion: CompiledConditionPredicate): string {
    return super.formatAssertion({
      lhs: 'value',
      ...assertion,
    });
  }

  private compileJITPredicate(lhs: string, assertion: CompiledConditionPredicate): string {
    return super.compileJITAssertion({
      lhs,
      ...assertion,
    });
  }

  private async generate(): Promise<string> {
    const { output } = await this.services.llm.generate(this.condition.data.prompt.text, {
      ...this.condition.data.prompt.settings,
    });

    // !TODO! - Add debug statement stating the number of consumed tokens;

    if (output === null) {
      this.log(`--- unable to produce valid LLM output ---`);

      throw new Error('prompt condition failed to obtain LLM output');
    }

    return output;
  }

  private async applyAssertions(isolate: ConditionIsolate, rawAnswer: string): Promise<boolean> {
    const parsedAnswer = this.parseValue(rawAnswer);

    const allResults = await Promise.all(
      this.condition.data.assertions.map((assertion) =>
        isolate.executeCode(this.compileJITPredicate(parsedAnswer, assertion))
      )
    );
    const finalResult = allResults.every(Boolean);

    if (!finalResult) {
      const firstFalse = allResults.findIndex((val) => !val);
      const assertion = this.condition.data.assertions[firstFalse];
      this.log(`- predicate '${this.formatPredicate(assertion)}' was false`);
    }

    return finalResult;
  }

  public async evaluate(): Promise<boolean> {
    this.log('--- evaluating prompt ---');

    const rawAnswer = await this.generate();

    this.log(`--- prompt received rawAnswer = ${rawAnswer} ---`);

    const isolate = new ConditionIsolate(this.variables);
    try {
      await isolate.initialize();

      // WARNING - Must explicitly await the code execution, otherwise, isolate cleanup in `finally`
      //           executes before the evaluated condition is fully computed.
      return await this.applyAssertions(isolate, rawAnswer);
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`an error occurred executing an prompt condition, msg = ${err.message}`);
      }
      throw new Error(
        `an unknown error occurred executing an prompt condition, details = ${JSON.stringify(err, null, 2).substring(
          0,
          300
        )}`
      );
    } finally {
      isolate.cleanup();
    }
  }
}
