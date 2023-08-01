import VError from '@voiceflow/verror';

import { ResolvedVariant } from '../response.types';
import { TranslationContext } from './translateVariants.interface';

// $TODO$ - Need to ensure that the translation doesn't mess up the markup content
// $TODO$ - This will be a somewhat difficult problem. We can't translate once the variables are all resolved and
//          everything is pieced together, because it might mess up the output if we expect an exact variable value
//          to show up.
//
//          However, if we translate before we resolve all the variables, then the translation might be slightly
//          inaccurate because the translation isn't using the full context.
export function translateVariants(currContext: TranslationContext, variants: Record<string, ResolvedVariant>) {
  if (currContext.toLang !== currContext.fromLang) {
    throw new VError('Translation is not implemented');
  }

  return variants;
}
