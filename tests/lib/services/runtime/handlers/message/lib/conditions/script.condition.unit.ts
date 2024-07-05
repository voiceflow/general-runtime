import { ConditionType } from '@voiceflow/dtos';
import { expect } from 'chai';
import Sinon from 'sinon';

import { ConditionServices } from '@/lib/services/runtime/handlers/message/lib/conditions/base.condition';
import { ScriptCondition } from '@/lib/services/runtime/handlers/message/lib/conditions/script.condition';

describe('ScriptCondition', () => {
  let variables: Record<string, unknown>;
  let services: ConditionServices;

  before(() => {
    variables = {
      propA: 1,
      propB: 'hello',
    };
    services = {
      llm: {
        generate: Sinon.stub(),
      },
    };
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
        services
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
        services
      );

      const result = await condition.evaluate();

      expect(result).to.eql(true);
    });
  });
});
