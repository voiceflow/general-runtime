/**
 * [[include:filter.md]]
 * @packageDocumentation
 */

import { TraceType } from '@voiceflow/general-types';
import { SpeakType } from '@voiceflow/general-types/build/nodes/speak';

import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';
import { sanitizeSSML } from './utils';

export const utils = {
  sanitizeSSML,
};

@injectServices({ utils })
class Filter extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  handle(context: Context) {
    const {
      data: { config = {} },
    } = context;

    if (config.stripSSML) {
      context = {
        ...context,
        trace: context.trace?.map((trace) =>
          !(trace.type === TraceType.SPEAK && (trace.payload.type === SpeakType.MESSAGE || trace.payload.type === SpeakType.AUDIO))
            ? trace
            : {
                ...trace,
                payload: {
                  ...trace.payload,
                  message: sanitizeSSML(trace.payload.message),
                },
              }
        ),
      };
    }

    return context;
  }
}

export default Filter;
