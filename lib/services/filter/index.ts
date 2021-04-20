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

    let traces = context.trace || [];

    const excludeTypes = config.excludeTypes || [TraceType.BLOCK, TraceType.DEBUG, TraceType.FLOW];
    traces = traces.filter((trace) => !excludeTypes.includes(trace.type));

    if (config.stripSSML !== false) {
      traces = traces?.map((trace) =>
        !(trace.type === TraceType.SPEAK && (trace.payload.type === SpeakType.MESSAGE || trace.payload.type === SpeakType.AUDIO))
          ? trace
          : {
              ...trace,
              payload: {
                ...trace.payload,
                message: sanitizeSSML(trace.payload.message),
              },
            }
      );
    }

    return {
      ...context,
      trace: traces,
    };
  }
}

export default Filter;
