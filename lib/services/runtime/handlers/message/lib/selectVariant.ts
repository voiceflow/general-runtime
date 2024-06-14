import { CompiledResponseMessage } from '@voiceflow/dtos';

import { BaseCondition } from './conditions/base.condition';

interface VariantConditionPair {
  variant: CompiledResponseMessage;
  conditions: BaseCondition[] | undefined;
}

export function selectVariant(variants: VariantConditionPair[]): CompiledResponseMessage {
  const conditionedVariants: VariantConditionPair[] = [];
  const unconditionedVariants: VariantConditionPair[] = [];

  variants.forEach((pair) => {
    if (pair.conditions?.length) {
      conditionedVariants.push(pair);
    } else {
      unconditionedVariants.push(pair);
    }
  });

  const matchingConditionedVariant = conditionedVariants.find((pair) =>
    pair.conditions!.every((cond) => cond.evaluate())
  );

  if (matchingConditionedVariant) {
    return matchingConditionedVariant.variant;
  }

  const randomIndex = Math.floor(Math.random() * unconditionedVariants.length);
  return unconditionedVariants[randomIndex].variant;
}
