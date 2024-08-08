import { AnyCompiledCondition, CompiledScriptCondition, ConditionType } from '@voiceflow/dtos';
import { expect } from 'chai';

import { createCondition } from '@/lib/services/runtime/handlers/message/lib/conditions/condition';
import { ScriptCondition } from '@/lib/services/runtime/handlers/message/lib/conditions/script.condition';

describe('createCondition', () => {
  let variables: Record<string, unknown>;

  beforeEach(() => {
    variables = {};
  });

  describe('is a factory for conditions', () => {
    it('creates expression condition', () => {
      const scriptCondition: CompiledScriptCondition = {
        type: ConditionType.SCRIPT,
        data: {
          code: 'return true;',
        },
      };

      const result = createCondition(scriptCondition, variables);

      expect(result).to.instanceOf(ScriptCondition);
    });

    it('creates script condition', () => {
      const scriptCondition: CompiledScriptCondition = {
        type: ConditionType.SCRIPT,
        data: {
          code: 'export default async function main(args) { return true; }',
        },
      };

      const result = createCondition(scriptCondition, variables);

      expect(result).to.instanceOf(ScriptCondition);
    });

    it('fails if unrecognized condition type received', () => {
      const invalidCondition = {
        id: 'dummy',
        type: 'invalid',
        data: {},
      } as unknown as AnyCompiledCondition;

      const operation = () => createCondition(invalidCondition, variables);

      expect(operation).to.throw(`received unexpected condition type`);
    });
  });
});
