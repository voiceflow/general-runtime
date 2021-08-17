import { Node, Trace } from '@voiceflow/base-types';
import htmlParse from 'html-parse-stringify';

import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';

export const utils = {};

@injectServices({ utils })
class Speak extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  parseSpeakTraces = (trace: Trace.AnyTrace): Trace.AnyTrace => {
    if (trace.type !== Node.Utils.TraceType.SPEAK) {
      return trace;
    }

    const node = htmlParse.parse(trace.payload.message)[0];

    if (!node || node.name !== 'audio') {
      return {
        ...trace,
        payload: {
          ...trace.payload,
          type: Node.Speak.TraceSpeakType.MESSAGE,
        },
      } as Trace.SpeakTrace;
    }

    return {
      ...trace,
      payload: {
        ...trace.payload,
        type: Node.Speak.TraceSpeakType.AUDIO,
        src: node.attrs.src || null,
      },
    };
  };

  handle = (context: Context) => {
    if (!context.trace) context.trace = [];

    return {
      ...context,
      trace: context.trace.map(this.parseSpeakTraces),
    };
  };
}

export default Speak;
