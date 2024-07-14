import { isIntentRequest } from '@voiceflow/dtos';

import { Context, ContextHandler } from '@/types';

import { shouldDoLLMReprompt } from '../nlu/utils';
import { AbstractManager } from '../utils';

class Reprompt extends AbstractManager implements ContextHandler {
  handle = async (context: Context) => {
    if (!isIntentRequest(context.request)) {
      return context;
    }

    if (!(await shouldDoLLMReprompt(context))) {
      return context;
    }

    return context;
  };
}

export default Reprompt;
