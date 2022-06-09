import { Context, ContextHandler } from '@/types';

import { isIntentRequest } from '../runtime/types';
import { AbstractManager, injectServices } from '../utils';
import { natoApcoConverter } from './natoApco';

export const utils = {};

@injectServices({ utils })
class SlotsService extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  handle = async (context: Context) => {
    if (!isIntentRequest(context.request)) {
      return context;
    }

    const version = await context.data.api.getVersion(context.versionID);
    if (!version) {
      throw new Error('Version not found!');
    }

    const slots = version.prototype?.model.slots;
    if (!slots) {
      return context;
    }

    const payload = context.request?.payload;
    natoApcoConverter(payload.entities, slots, payload.query);

    return context;
  };
}

export default SlotsService;
