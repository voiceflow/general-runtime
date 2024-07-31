import { Context, ContextHandler } from '@/types';

import { isIntentRequest } from '../runtime/types';
import { AbstractManager } from '../utils';

export default class ExitScenarioManager extends AbstractManager implements ContextHandler {
  handle = async (context: Context) => {
    if (!isIntentRequest(context.request)) return context;

    // TODO: check node type for exit scenario stuff

    context.request = {
      type: 'exit-scenario',
    };

    return context;
  };
}
