import { BaseTrace, BaseUtils, Trace } from '@voiceflow/base-types';
import * as DTO from '@voiceflow/dtos';

import { sanitizeSSML } from '@/lib/services/filter/utils';
import { RuntimeRequest } from '@/lib/services/runtime/types';
import { Store } from '@/runtime';
import { Context, ContextHandler } from '@/types';

import { AbstractManager } from './utils';

const MAX_TURNS = 10;

// writes a primative string aiAssistTranscript into the context state storage
class AIAssist extends AbstractManager implements ContextHandler {
  static StorageKey = '_memory_';

  static StringStorageKey = 'vf_memory';

  static getInput(request: RuntimeRequest) {
    if (DTO.isLegacyIntentRequest(request)) {
      return request.payload.query;
    }

    if (DTO.isTextRequest(request)) {
      return request.payload;
    }

    if (DTO.isPathRequest(request)) {
      return request.payload?.label ?? null;
    }

    return null;
  }

  static stringifyTranscript(messages: BaseUtils.ai.Message[]) {
    return messages.map(({ role, content }) => `${role}: ${content}`).join('\n');
  }

  static injectOutput(variables: Store, trace: BaseTrace.TextTrace | BaseTrace.SpeakTrace) {
    const transcript = (variables.get(AIAssist.StorageKey) as BaseUtils.ai.Message[]) || [];

    const lastTranscript = transcript[transcript.length - 1];

    const content = trace.type === Trace.TraceType.SPEAK ? sanitizeSSML(trace.payload.message) : trace.payload.message;

    if (lastTranscript?.role === BaseUtils.ai.Role.ASSISTANT) {
      lastTranscript.content += `\n${content}`;

      // truncate the content if it's too long, consecutive assistant messages can accumulate
      lastTranscript.content = lastTranscript.content.substring(0, 10000);
    } else {
      transcript.push({ role: BaseUtils.ai.Role.ASSISTANT, content });
      if (transcript.length > MAX_TURNS) transcript.shift();
    }

    variables.set(AIAssist.StorageKey, transcript);
    variables.set(AIAssist.StringStorageKey, AIAssist.stringifyTranscript(transcript));
  }

  handle = async (context: Context) => {
    if (!context.version?.projectID) return context;

    const { request } = context;

    const input = AIAssist.getInput(request);
    const transcript: BaseUtils.ai.Message[] = context.state.variables[AIAssist.StorageKey] || [];

    if (input) {
      const transcript: BaseUtils.ai.Message[] = context.state.variables[AIAssist.StorageKey] || [];
      transcript.push({ role: BaseUtils.ai.Role.USER, content: input });

      if (transcript.length > MAX_TURNS) transcript.shift();
    }

    return {
      ...context,
      state: {
        ...context.state,
        variables: {
          ...context.state.variables,
          [AIAssist.StorageKey]: transcript,
          [AIAssist.StringStorageKey]: AIAssist.stringifyTranscript(transcript),
        },
      },
    };
  };
}

export default AIAssist;
