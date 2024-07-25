import { ConditionType } from '@voiceflow/dtos';
import { expect } from 'chai';

import { ScriptCondition } from '@/lib/services/runtime/handlers/message/lib/conditions/script.condition';

describe('ScriptCondition', () => {
  let variables: Record<string, unknown>;

  before(() => {
    variables = {
      propA: 1,
      propB: 'hello',
    };
  });

  describe('evaluate', () => {
    it('works', async () => {
      const condition = new ScriptCondition(
        {
          type: ConditionType.SCRIPT,
          data: {
            code: `
            const { propA, propB } = variables;
            return propA + propB === "1hello";
          `,
          },
        },
        variables
      );

      const result = await condition.evaluate();

      expect(result).to.eql(true);
    });

    it('always produces a boolean', async () => {
      const condition = new ScriptCondition(
        {
          type: ConditionType.SCRIPT,
          data: {
            code: `
            return "this is not a boolean";
          `,
          },
        },
        variables
      );

      const result = await condition.evaluate();

      expect(result).to.eql(true);
    });
  });
});
