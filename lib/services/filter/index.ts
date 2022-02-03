/**
 * [[include:filter.md]]
 * @packageDocumentation
 */

import { BaseNode } from '@voiceflow/base-types';

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

    const excludeTypes = config.excludeTypes || [BaseNode.Utils.TraceType.BLOCK, BaseNode.Utils.TraceType.DEBUG, BaseNode.Utils.TraceType.FLOW];
    traces = traces.filter((trace) => !excludeTypes.includes(trace.type));

    if (config.stripSSML !== false) {
      traces = traces?.map((trace) =>
        !(
          trace.type === BaseNode.Utils.TraceType.SPEAK &&
          (trace.payload.type === BaseNode.Speak.TraceSpeakType.MESSAGE || trace.payload.type === BaseNode.Speak.TraceSpeakType.AUDIO)
        )
          ? trace
          : {
              ...trace,
              payload: {
                ...trace.payload,
                message: this.services.utils.sanitizeSSML(trace.payload.message),
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
