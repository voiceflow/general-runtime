import { CompiledValueVariableCondition, ConditionOperation, ConditionType } from '@voiceflow/dtos';
import { expect } from 'chai';

import { ValueVariableCondition } from '@/lib/services/runtime/handlers/message/lib/conditions/value-variable.condition';
import { selectVariant } from '@/lib/services/runtime/handlers/message/lib/selectVariant';

describe('selectVariant', () => {
  let variables: Record<string, unknown>;

  before(() => {
    variables = {
      propA: 1,
      propB: 'hello',
      propC: true,
    };
  });

  it('selects a random unconditioned variant, if no matching conditioned variant exists', async () => {
    const variants = [
      {
        variant: {
          data: {
            text: [
              {
                children: [
                  {
                    text: 'Unconditioned variant A',
                  },
                ],
              },
            ],
            delay: 137,
          },
          condition: null,
        },
        condition: null,
      },
      {
        variant: {
          data: {
            text: [
              {
                children: [
                  {
                    text: 'Unconditioned variant B',
                  },
                ],
              },
            ],
            delay: 137,
          },
          condition: null,
        },
        condition: null,
      },
      {
        variant: {
          data: {
            text: [
              {
                children: [
                  {
                    text: 'Unconditioned variant C',
                  },
                ],
              },
            ],
            delay: 137,
          },
          condition: null,
        },
        condition: null,
      },
    ];

    const selectedVariant = await selectVariant(variants);

    expect(selectedVariant.data.text[0].children[0].text).to.oneOf([
      'Unconditioned variant A',
      'Unconditioned variant B',
      'Unconditioned variant C',
    ]);
  });

  it('selects the first matching conditioned variant', async () => {
    const falseCondition: CompiledValueVariableCondition = {
      type: ConditionType.VALUE_VARIABLE,
      data: {
        matchAll: true,
        assertions: [
          {
            lhs: '1',
            operation: ConditionOperation.IS,
            rhs: '2',
          },
        ],
      },
    };

    const trueConditionA: CompiledValueVariableCondition = {
      type: ConditionType.VALUE_VARIABLE,
      data: {
        matchAll: true,
        assertions: [
          {
            lhs: '1 + 1',
            operation: ConditionOperation.IS,
            rhs: '2',
          },
        ],
      },
    };

    const trueConditionB: CompiledValueVariableCondition = {
      type: ConditionType.VALUE_VARIABLE,
      data: {
        matchAll: true,
        assertions: [
          {
            lhs: '2 * 1',
            operation: ConditionOperation.IS,
            rhs: '2',
          },
        ],
      },
    };

    const variants = [
      {
        variant: {
          data: {
            text: [
              {
                children: [
                  {
                    text: 'Conditioned variant A',
                  },
                ],
              },
            ],
            delay: 137,
          },
          condition: falseCondition,
        },
        condition: new ValueVariableCondition(falseCondition, variables),
      },
      {
        variant: {
          data: {
            text: [
              {
                children: [
                  {
                    text: 'Unconditioned variant A',
                  },
                ],
              },
            ],
            delay: 137,
          },
          condition: null,
        },
        condition: null,
      },
      {
        variant: {
          data: {
            text: [
              {
                children: [
                  {
                    text: 'Conditioned variant B',
                  },
                ],
              },
            ],
            delay: 137,
          },
          condition: trueConditionA,
        },
        condition: new ValueVariableCondition(trueConditionA, variables),
      },
      {
        variant: {
          data: {
            text: [
              {
                children: [
                  {
                    text: 'Unconditioned variant B',
                  },
                ],
              },
            ],
            delay: 137,
          },
          condition: null,
        },
        condition: null,
      },
      {
        variant: {
          data: {
            text: [
              {
                children: [
                  {
                    text: 'Conditioned variant C',
                  },
                ],
              },
            ],
            delay: 137,
          },
          condition: trueConditionB,
        },
        condition: new ValueVariableCondition(trueConditionB, variables),
      },
    ];

    const selectedVariant = await selectVariant(variants);

    expect(selectedVariant.data.text[0].children[0].text).to.eq('Conditioned variant B');
  });
});
