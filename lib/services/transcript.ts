import { Trace } from '@voiceflow/base-types';

import { sanitizeSSML } from '@/lib/services/filter/utils';
import { isIntentRequest, isTextRequest, RuntimeRequest } from '@/lib/services/runtime/types';
import { Context, ContextHandler } from '@/types';

import { AbstractManager } from './utils';

const MAX_TURNS = 3;

// writes a primative string transcript into the context state storage
class Transcript extends AbstractManager implements ContextHandler {
  static StorageKey = 'transcript';

  static getInput(request: RuntimeRequest) {
    return (isIntentRequest(request) && request.payload.query) || (isTextRequest(request) && request.payload) || null;
  }

  handle = async (context: Context) => {
    // only store transcript if freestyle is enabled
    const project = await context.data.api.getProject(context.versionID).catch(() => null);
    if (!project?.aiAssistSettings?.freestyle) return context;

    /**
    // skip storing no matches into transcript
    if (context.trace?.find((trace: any) => trace.type === Trace.TraceType.PATH && trace.payload.path === 'reprompt')) {
      return context;
    }
    */

    const { request, trace } = context;

    const input = Transcript.getInput(request);

    const output =
      trace?.reduce((acc, t) => {
        if (t.type === Trace.TraceType.SPEAK) {
          acc += sanitizeSSML(t.payload.message);
        }
        if (t.type === Trace.TraceType.TEXT) {
          acc += t.payload.message;
        }
        return acc;
      }, '') || null;

    if (!input && !output) return context;

    const transcript = context.state.storage[Transcript.StorageKey] || [];

    transcript.push([input, output]);

    if (transcript.length > MAX_TURNS) transcript.shift();

    return {
      ...context,
      state: {
        ...context.state,
        storage: {
          ...context.state.storage,
          [Transcript.StorageKey]: transcript,
        },
      },
    };
  };
}

export default Transcript;
