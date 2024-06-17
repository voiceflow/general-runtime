// !TODO! - How to get rid of this
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { CompiledResponseMessage } from '@voiceflow/dtos';

import { BaseCondition } from './conditions/base.condition';

interface VariantConditionPair {
  variant: CompiledResponseMessage;
  condition: BaseCondition | null;
}

export async function selectVariant(variants: VariantConditionPair[]): Promise<CompiledResponseMessage> {
  const conditionedVariants: VariantConditionPair[] = [];
  const unconditionedVariants: VariantConditionPair[] = [];

  variants.forEach((pair) => {
    if (pair.condition) {
      conditionedVariants.push(pair);
    } else {
      unconditionedVariants.push(pair);
    }
  });

  for (const pair of conditionedVariants) {
    const isMatching = await pair.condition!.evaluate();

    if (isMatching) {
      return pair.variant;
    }
  }

  const randomIndex = Math.floor(Math.random() * unconditionedVariants.length);
  return unconditionedVariants[randomIndex].variant;
}
