/**
 * [[include:tts.md]]
 * @packageDocumentation
 */

import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import _ from 'lodash';

import log from '@/logger';
import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';

export const utils = {};

@injectServices({ utils })
class TTS extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  fetchTTS = async (node: BaseNode.Speak.TraceFrame, locale?: string): Promise<BaseTrace.SpeakTrace[]> => {
    try {
      const { data } = await this.services.axios.post<BaseTrace.SpeakTrace['payload'][]>(
        `${this.config.GENERAL_SERVICE_ENDPOINT}/tts/convert`,
        {
          ssml: node.payload.message,
        },
        {
          params: { ...(locale && { locale }) },
        }
      );

      return data.map((payload) => ({
        type: BaseNode.Utils.TraceType.SPEAK,
        payload: { ...node.payload, ...payload },
      }));
    } catch (error) {
      log.error(`[app] [runtime] [${TTS.name}] failed to fetch TTS %o`, { error });
      return [
        {
          type: BaseNode.Utils.TraceType.SPEAK,
          payload: { message: node.payload.message, type: BaseNode.Speak.TraceSpeakType.AUDIO },
        },
      ];
    }
  };

  handle = async (context: Context) => {
    if (!context.trace) context.trace = [];
    if (!this.config.GENERAL_SERVICE_ENDPOINT) {
      return context;
    }

    const trace = await Promise.all(
      context.trace.map(async (frame) => {
        if (frame.type === BaseNode.Utils.TraceType.SPEAK) {
          return this.fetchTTS(frame, context.data.locale);
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
