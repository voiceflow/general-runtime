import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';

export const utils = {};

@injectServices({ utils })
class DebugLogging extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  handle(context: Context): Context {
    if (context.maxLogLevel) {
      // Update the max log level if possible
      // The types say that context.maxLogLevel can be undefined but in practice that should never happen

      const runtime = this.services.runtime.getRuntimeForContext(context);

      runtime.debugLogging.maxLogLevel = context.maxLogLevel;
    }

    return context;
  }
}

export default DebugLogging;
