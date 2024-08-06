import { CompiledResponseMessage } from '@voiceflow/dtos';
import { noop } from 'lodash';

import { slateToPlaintext } from '../../../utils';
import { BaseCondition } from './conditions/base.condition';

interface VariantConditionPair {
  variant: CompiledResponseMessage;
  condition: BaseCondition | null;
}

type Log = (message: string) => void;

export async function selectVariant(
  variants: VariantConditionPair[],
  log: Log = noop
): Promise<CompiledResponseMessage> {
  const [conditionedVariants, unconditionedVariants]: [VariantConditionPair[], VariantConditionPair[]] =
    variants.reduce(
      ([conditioned, unconditioned], pair) => {
        if (pair.condition) {
          conditioned.push(pair);
        } else {
          unconditioned.push(pair);
        }
        return [conditioned, unconditioned];
      },
      [[], []] as [VariantConditionPair[], VariantConditionPair[]]
    );

  /* eslint-disable no-await-in-loop */
  // eslint-disable-next-line no-restricted-syntax
  for (const pair of conditionedVariants) {
    const isMatching = await pair.condition!.evaluate();

    log(`'${slateToPlaintext(pair.variant.data.text)}' returned value '${isMatching}'`);

    if (isMatching) {
      return pair.variant;
    }
  }
  /* eslint-enable no-await-in-loop */

  log(`All conditioned variants evaluated to false, selecting a random unconditioned variant`);

  const randomIndex = Math.floor(Math.random() * unconditionedVariants.length);
  return unconditionedVariants[randomIndex].variant;
}
