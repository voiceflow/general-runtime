import { GeneralTrace, TraceType } from '@voiceflow/general-types';
import { SpeakType, TraceFrame as SpeakTrace } from '@voiceflow/general-types/build/nodes/speak';
import htmlParse from 'html-parse-stringify';
import _ from 'lodash';

import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';

export const utils = {};

@injectServices({ utils })
class Audio extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  parseAudioStepSrc = (trace: GeneralTrace): GeneralTrace => {
    if (trace.type !== TraceType.SPEAK) {
      return trace;
    }

    const node = htmlParse.parse(trace.payload.message)[0];

    if (!node || node.name !== 'audio') {
      return {
        ...trace,
        payload: {
          ...trace.payload,
          type: SpeakType.MESSAGE,
        },
      } as SpeakTrace;
    }

    return {
      ...trace,
      payload: {
        ...trace.payload,
        type: SpeakType.AUDIO,
        src: node.attrs.src || null,
      },
    };
  };

  handle = (context: Context) => {
    if (!context.trace) context.trace = [];

    return {
      ...context,
      trace: context.trace.map(this.parseAudioStepSrc),
    };
  };
}

export default Audio;
