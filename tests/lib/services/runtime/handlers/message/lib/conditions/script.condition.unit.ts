import { ConditionType } from '@voiceflow/dtos';
import { expect } from 'chai';

import { ScriptCondition } from '@/lib/services/runtime/handlers/message/lib/conditions/script.condition';
import { GeneralRuntime } from '@/lib/services/runtime/types';

describe('ScriptCondition', () => {
  let variables: Record<string, unknown>;
  let runtime: GeneralRuntime;

  before(() => {
    variables = {
      propA: 1,
      propB: 'hello',
    };
    runtime = {
      services: {},
    } as unknown as GeneralRuntime;
  });

  describe('evaluate', () => {
    it('works', async () => {
      const condition = new ScriptCondition(
        {
          type: ConditionType.SCRIPT,
          data: {
            code: `export default function main({ variables }) { 
            const { propA, propB } = variables;
            return propA + propB === "1hello";
          }`,
          },
        },
        variables,
        runtime.services
      );

      const result = await condition.evaluate();

      expect(result).to.eql(true);
    });

    it('always produces a boolean', async () => {
      const condition = new ScriptCondition(
        {
          type: ConditionType.SCRIPT,
          data: {
            code: `export default function main() { 
            return "this is not a boolean";
          }`,
          },
        },
        variables,
        runtime.services
      );

      const result = await condition.evaluate();

      expect(result).to.eql(true);
    });
  });
});
