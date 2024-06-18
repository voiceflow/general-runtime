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

  /* eslint-disable no-await-in-loop */
  // eslint-disable-next-line no-restricted-syntax
  for (const pair of conditionedVariants) {
    const isMatching = await pair.condition!.evaluate();

    if (isMatching) {
      return pair.variant;
    }
  }
  /* eslint-enable no-await-in-loop */

  const randomIndex = Math.floor(Math.random() * unconditionedVariants.length);
  return unconditionedVariants[randomIndex].variant;
}
