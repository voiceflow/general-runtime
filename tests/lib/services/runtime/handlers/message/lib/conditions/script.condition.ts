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
            code: `export default function main({ inputVars }) { 
            const { propA, propB } = inputVars;
            return propA + propB === "1hello";
          }`,
          },
        },
        variables
      );

      const result = await condition.evaluate();

      expect(result).to.eql(true);
    });
  });
});
