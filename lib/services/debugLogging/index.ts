import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';

export const utils = {};

@injectServices({ utils })
class DebugLogging extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  handle(context: Context): Context {
    // This is handler is a no-op right now, leaving it here for future use if needed
    return context;
  }
}

export default DebugLogging;
