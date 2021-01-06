import { TraceType } from '@voiceflow/general-types';
import { TraceFrame as SpeakTrace } from '@voiceflow/general-types/build/nodes/speak';
import _ from 'lodash';

import log from '@/logger';
import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';

export const utils = {};

@injectServices({ utils })
class TTS extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  fetchTTS = async (message: string): Promise<SpeakTrace[]> => {
    try {
      const { data } = await this.services.axios.post<SpeakTrace['payload'][]>(`${this.config.GENERAL_SERVICE_ENDPOINT}/tts/convert`, {
        ssml: message,
      });

      return data.map((payload) => ({ type: TraceType.SPEAK, payload }));
    } catch (error) {
      log.error(error);
      return [{ type: TraceType.SPEAK, payload: { message, type: 'speak' } }];
    }
  };

  handle = async (context: Context) => {
    if (!context.trace) context.trace = [];

    const trace = await Promise.all(
      context.trace.map(async (frame) => {
        if (frame.type === TraceType.SPEAK) {
          return this.fetchTTS(frame.payload.message);
        }
        return frame;
      })
    );

    return {
      ...context,
      trace: _.flatMap(trace),
    };
  };
}

export default TTS;
