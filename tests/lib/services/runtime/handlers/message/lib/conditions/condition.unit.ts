import {
  AIModel,
  AnyCompiledCondition,
  CompiledExpressionCondition,
  CompiledPromptCondition,
  CompiledScriptCondition,
  ConditionType,
} from '@voiceflow/dtos';
import { expect } from 'chai';

import { createCondition } from '@/lib/services/runtime/handlers/message/lib/conditions/condition';
import { ExpressionCondition } from '@/lib/services/runtime/handlers/message/lib/conditions/expression.condition';
import { PromptCondition } from '@/lib/services/runtime/handlers/message/lib/conditions/prompt.condition';
import { ScriptCondition } from '@/lib/services/runtime/handlers/message/lib/conditions/script.condition';
import { Runtime, Store } from '@/runtime';

describe('createCondition', () => {
  let runtime: Runtime;
  let variables: Store;

  beforeEach(() => {
    runtime = {} as unknown as Runtime;
    variables = new Store({});
  });

  describe('is a factory for conditions', () => {
    it('creates expression condition', () => {
      const expressionCondition: CompiledExpressionCondition = {
        type: ConditionType.EXPRESSION,
        data: {
          matchAll: false,
          assertions: [],
        },
      };

      const result = createCondition(expressionCondition, runtime, variables);

      expect(result).to.instanceOf(ExpressionCondition);
    });

    it('creates script condition', () => {
      const scriptCondition: CompiledScriptCondition = {
        type: ConditionType.SCRIPT,
        data: {
          code: 'export default async function main(args) { return true; }',
        },
      };

      const result = createCondition(scriptCondition, runtime, variables);

      expect(result).to.instanceOf(ScriptCondition);
    });

    it('creates prompt condition', () => {
      const promptCondition: CompiledPromptCondition = {
        type: ConditionType.PROMPT,
        data: {
          turns: 37,
          prompt: {
            text: 'list the 10 presidents of all time',
            settings: {
              model: AIModel.CLAUDE_3_HAIKU,
              maxLength: 137,
              temperature: 237,
              systemPrompt: 'You are a noble knight of the realm',
            },
          },
          assertions: [
            {
              rhs: '1 + 3',
              operation: 'is',
            },
            {
              rhs: 'hello',
              operation: 'is',
            },
          ],
        },
      };

      const result = createCondition(promptCondition, runtime, variables);

      expect(result).to.instanceOf(PromptCondition);
    });

    it('fails if unrecognized condition type received', () => {
      const invalidCondition = {
        id: 'dummy',
        type: 'invalid',
        data: {},
      } as unknown as AnyCompiledCondition;

      const operation = () => createCondition(invalidCondition, runtime, variables);

      expect(operation).to.throw(`received unexpected condition type`);
    });
  });
});
