import { CompiledConditionAssertion, ConditionOperation, ConditionType } from '@voiceflow/dtos';
import { expect } from 'chai';

import { ValueVariableCondition } from '@/lib/services/runtime/handlers/message/lib/conditions/value-variable.condition';

const createSingleValueVariableExpression = (
  variables: Record<string, unknown>,
  assertions: CompiledConditionAssertion[]
) =>
  new ValueVariableCondition(
    {
      type: ConditionType.VALUE_VARIABLE,
      data: {
        matchAll: true,
        assertions,
      },
    },
    variables
  );

describe('ValueVariableCondition', () => {
  let variables: Record<string, unknown>;

  before(() => {
    variables = {
      propA: 1,
      propB: 'hello',
      propC: true,
    };
  });

  describe('evaluate', () => {
    it('AND expression - true if all are true', async () => {
      const condition = new ValueVariableCondition(
        {
          type: ConditionType.VALUE_VARIABLE,
          data: {
            matchAll: true,
            assertions: [
              {
                lhs: 'propA + 2',
                operation: ConditionOperation.IS,
                rhs: '4 * propA - 1',
              },
              {
                lhs: 'propA * 2',
                operation: ConditionOperation.GREATER_THAN,
                rhs: 'propA',
              },
            ],
          },
        },
        variables
      );

      const result = await condition.evaluate();

      expect(result).to.eql(true);
    });

    it('AND expression - false if one is false', async () => {
      const condition = new ValueVariableCondition(
        {
          type: ConditionType.VALUE_VARIABLE,
          data: {
            matchAll: true,
            assertions: [
              {
                lhs: 'propA + 2',
                operation: ConditionOperation.IS,
                rhs: '4 * propA - 1',
              },
              {
                lhs: 'propA',
                operation: ConditionOperation.GREATER_THAN,
                rhs: 'propA',
              },
            ],
          },
        },
        variables
      );

      const result = await condition.evaluate();

      expect(result).to.eql(false);
    });

    it('OR expression - true if one is true', async () => {
      const condition = new ValueVariableCondition(
        {
          type: ConditionType.VALUE_VARIABLE,
          data: {
            matchAll: false,
            assertions: [
              {
                lhs: 'propA + 2',
                operation: ConditionOperation.IS,
                rhs: '4 * propA - 1',
              },
              {
                lhs: 'propA',
                operation: ConditionOperation.GREATER_THAN,
                rhs: 'propA',
              },
            ],
          },
        },
        variables
      );

      const result = await condition.evaluate();

      expect(result).to.eql(true);
    });

    it('OR expression - false if all are false', async () => {
      const condition = new ValueVariableCondition(
        {
          type: ConditionType.VALUE_VARIABLE,
          data: {
            matchAll: false,
            assertions: [
              {
                lhs: 'propA + 2',
                operation: ConditionOperation.IS_NOT,
                rhs: '4 * propA - 1',
              },
              {
                lhs: 'propA',
                operation: ConditionOperation.GREATER_THAN,
                rhs: 'propA',
              },
            ],
          },
        },
        variables
      );

      const result = await condition.evaluate();

      expect(result).to.eql(false);
    });
  });

  describe("'IS' operator", async () => {
    it('true if types and values are equal', async () => {
      const condition = createSingleValueVariableExpression(variables, [
        {
          lhs: '1',
          operation: ConditionOperation.IS,
          rhs: '1',
        },
      ]);

      const result = await condition.evaluate();

      expect(result).to.eql(true);
    });

    it('true if values are "intuitively" equal', async () => {
      const condition = createSingleValueVariableExpression(variables, [
        {
          lhs: '1',
          operation: ConditionOperation.IS,
          rhs: '"1"',
        },
      ]);

      const result = await condition.evaluate();

      expect(result).to.eql(true);
    });

    it('false if values are not equal', async () => {
      const condition = createSingleValueVariableExpression(variables, [
        {
          lhs: '1',
          operation: ConditionOperation.IS,
          rhs: '2',
        },
      ]);

      const result = await condition.evaluate();

      expect(result).to.eql(false);
    });
  });

  describe("'IS_NOT' operator", async () => {
    it('true if types and values are unequal', async () => {
      const condition = createSingleValueVariableExpression(variables, [
        {
          lhs: '1',
          operation: ConditionOperation.IS_NOT,
          rhs: '2',
        },
      ]);

      const result = await condition.evaluate();

      expect(result).to.eql(true);
    });

    it('false if values are "intuitively" equal', async () => {
      const condition = createSingleValueVariableExpression(variables, [
        {
          lhs: '1',
          operation: ConditionOperation.IS_NOT,
          rhs: '"1"',
        },
      ]);

      const result = await condition.evaluate();

      expect(result).to.eql(false);
    });

    it('false if values are equal', async () => {
      const condition = createSingleValueVariableExpression(variables, [
        {
          lhs: '1',
          operation: ConditionOperation.IS_NOT,
          rhs: '1',
        },
      ]);

      const result = await condition.evaluate();

      expect(result).to.eql(false);
    });
  });

  describe("'IS_EMPTY' operator", async () => {
    it('true iff number is zero', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: '0',
          operation: ConditionOperation.IS_EMPTY,
          rhs: '',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: '1',
          operation: ConditionOperation.IS_EMPTY,
          rhs: '',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();

      expect(result1).to.eql(true);
      expect(result2).to.eql(false);
    });

    it('true iff string is empty', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: '""',
          operation: ConditionOperation.IS_EMPTY,
          rhs: '',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: '"0"',
          operation: ConditionOperation.IS_EMPTY,
          rhs: '',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();

      expect(result1).to.eql(true);
      expect(result2).to.eql(false);
    });

    it('true iff boolean is false', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: 'false',
          operation: ConditionOperation.IS_EMPTY,
          rhs: '',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: 'true',
          operation: ConditionOperation.IS_EMPTY,
          rhs: '',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();

      expect(result1).to.eql(true);
      expect(result2).to.eql(false);
    });

    it('true iff array is empty', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: '[]',
          operation: ConditionOperation.IS_EMPTY,
          rhs: '',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: '[1]',
          operation: ConditionOperation.IS_EMPTY,
          rhs: '',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();

      expect(result1).to.eql(true);
      expect(result2).to.eql(false);
    });
  });

  describe("'IS_NOT_EMPTY' operator", async () => {
    it('true iff number is not zero', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: '1',
          operation: ConditionOperation.IS_NOT_EMPTY,
          rhs: '',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: '0',
          operation: ConditionOperation.IS_NOT_EMPTY,
          rhs: '',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();

      expect(result1).to.eql(true);
      expect(result2).to.eql(false);
    });

    it('true iff string is not empty', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: '"example"',
          operation: ConditionOperation.IS_NOT_EMPTY,
          rhs: '',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: '""',
          operation: ConditionOperation.IS_NOT_EMPTY,
          rhs: '',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();

      expect(result1).to.eql(true);
      expect(result2).to.eql(false);
    });

    it('true iff boolean is true', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: 'true',
          operation: ConditionOperation.IS_NOT_EMPTY,
          rhs: '',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: 'false',
          operation: ConditionOperation.IS_NOT_EMPTY,
          rhs: '',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();

      expect(result1).to.eql(true);
      expect(result2).to.eql(false);
    });

    it('true iff array is non-empty', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: '[1]',
          operation: ConditionOperation.IS_NOT_EMPTY,
          rhs: '',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: '[]',
          operation: ConditionOperation.IS_NOT_EMPTY,
          rhs: '',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();

      expect(result1).to.eql(true);
      expect(result2).to.eql(false);
    });
  });

  describe("'GREATER_THAN' operator", async () => {
    it('works', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: '2',
          operation: ConditionOperation.GREATER_THAN,
          rhs: '1',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: '1',
          operation: ConditionOperation.GREATER_THAN,
          rhs: '1',
        },
      ]);

      const condition3 = createSingleValueVariableExpression(variables, [
        {
          lhs: '0',
          operation: ConditionOperation.GREATER_THAN,
          rhs: '1',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();
      const result3 = await condition3.evaluate();

      expect(result1).to.eql(true);
      expect(result2).to.eql(false);
      expect(result3).to.eql(false);
    });
  });

  describe("'GREATER_OR_EQUAL' operator", async () => {
    it('works', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: '3',
          operation: ConditionOperation.GREATER_OR_EQUAL,
          rhs: '1',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: '1',
          operation: ConditionOperation.GREATER_OR_EQUAL,
          rhs: '1',
        },
      ]);

      const condition3 = createSingleValueVariableExpression(variables, [
        {
          lhs: '0',
          operation: ConditionOperation.GREATER_OR_EQUAL,
          rhs: '1',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();
      const result3 = await condition3.evaluate();

      expect(result1).to.eql(true);
      expect(result2).to.eql(true);
      expect(result3).to.eql(false);
    });
  });

  describe("'LESS_THAN' operator", async () => {
    it('works', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: '3',
          operation: ConditionOperation.LESS_THAN,
          rhs: '1',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: '1',
          operation: ConditionOperation.LESS_THAN,
          rhs: '1',
        },
      ]);

      const condition3 = createSingleValueVariableExpression(variables, [
        {
          lhs: '0',
          operation: ConditionOperation.LESS_THAN,
          rhs: '1',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();
      const result3 = await condition3.evaluate();

      expect(result1).to.eql(false);
      expect(result2).to.eql(false);
      expect(result3).to.eql(true);
    });
  });

  describe("'LESS_OR_EQUAL' operator", async () => {
    it('works', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: '3',
          operation: ConditionOperation.LESS_OR_EQUAL,
          rhs: '1',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: '1',
          operation: ConditionOperation.LESS_OR_EQUAL,
          rhs: '1',
        },
      ]);

      const condition3 = createSingleValueVariableExpression(variables, [
        {
          lhs: '0',
          operation: ConditionOperation.LESS_OR_EQUAL,
          rhs: '1',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();
      const result3 = await condition3.evaluate();

      expect(result1).to.eql(false);
      expect(result2).to.eql(true);
      expect(result3).to.eql(true);
    });
  });

  describe("'CONTAINS' operator", async () => {
    it('works', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: '"andRABBITbread"',
          operation: ConditionOperation.CONTAINS,
          rhs: '"drab"',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: '"andRABBITbread"',
          operation: ConditionOperation.CONTAINS,
          rhs: '"does-not-exist"',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();

      expect(result1).to.eql(true);
      expect(result2).to.eql(false);
    });
  });

  describe("'NOT_CONTAINS' operator", async () => {
    it('works', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: '"andRABBITbread"',
          operation: ConditionOperation.NOT_CONTAINS,
          rhs: '"drab"',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: '"andRABBITbread"',
          operation: ConditionOperation.NOT_CONTAINS,
          rhs: '"does-not-exist"',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();

      expect(result1).to.eql(false);
      expect(result2).to.eql(true);
    });
  });

  describe("'STARTS_WITH' operator", async () => {
    it('works', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: '"andRABBITbread"',
          operation: ConditionOperation.STARTS_WITH,
          rhs: '"andra"',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: '"andRABBITbread"',
          operation: ConditionOperation.STARTS_WITH,
          rhs: '"does-not-exist"',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();

      expect(result1).to.eql(true);
      expect(result2).to.eql(false);
    });
  });

  describe("'ENDS_WITH' operator", async () => {
    it('works', async () => {
      const condition1 = createSingleValueVariableExpression(variables, [
        {
          lhs: '"andRABBITbread"',
          operation: ConditionOperation.ENDS_WITH,
          rhs: '"bread"',
        },
      ]);

      const condition2 = createSingleValueVariableExpression(variables, [
        {
          lhs: '"andRABBITbread"',
          operation: ConditionOperation.ENDS_WITH,
          rhs: '"does-not-exist"',
        },
      ]);

      const result1 = await condition1.evaluate();
      const result2 = await condition2.evaluate();

      expect(result1).to.eql(true);
      expect(result2).to.eql(false);
    });
  });

  describe('returns false if exception occurs', async () => {
    it('works', async () => {
      /**
       * This expression fails because it compiles to the javascript `hello == hello`
       * where `hello` is an undefined variable.
       */
      const condition = createSingleValueVariableExpression(variables, [
        {
          lhs: 'hello',
          operation: ConditionOperation.IS,
          rhs: 'hello',
        },
      ]);

      const result = await condition.evaluate();

      expect(result).to.eql(false);
    });
  });
});
