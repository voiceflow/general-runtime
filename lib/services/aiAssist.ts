import { Trace } from '@voiceflow/base-types';

import { sanitizeSSML } from '@/lib/services/filter/utils';
import { isIntentRequest, isTextRequest, RuntimeRequest } from '@/lib/services/runtime/types';
import { Context, ContextHandler } from '@/types';

import { AbstractManager } from './utils';

const MAX_TURNS = 3;

// writes a primative string aiAssistTranscript into the context state storage
class AIAssist extends AbstractManager implements ContextHandler {
  static StorageKey = 'aiAssistTranscript';

  static getInput(request: RuntimeRequest) {
    return (isIntentRequest(request) && request.payload.query) || (isTextRequest(request) && request.payload) || null;
  }

  handle = async (context: Context) => {
    if (!context.version?.projectID) return context;

    // only store aiAssistTranscript if freestyle is enabled
    const project = await context.data.api.getProject(context.version.projectID).catch(() => null);
    if (!project?.aiAssistSettings?.freestyle) return context;

    /**
    // skip storing no matches into aiAssistTranscript
    if (context.trace?.find((trace: any) => trace.type === Trace.TraceType.PATH && trace.payload.path === 'reprompt')) {
      return context;
    }
    */

    const { request, trace } = context;

    const input = AIAssist.getInput(request);

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

    const aiAssistTranscript = context.state.storage[AIAssist.StorageKey] || [];

    aiAssistTranscript.push([input, output]);

    if (aiAssistTranscript.length > MAX_TURNS) aiAssistTranscript.shift();

    return {
      ...context,
      state: {
        ...context.state,
        storage: {
          ...context.state.storage,
          [AIAssist.StorageKey]: aiAssistTranscript,
        },
      },
    };
  };
}

export default AIAssist;
