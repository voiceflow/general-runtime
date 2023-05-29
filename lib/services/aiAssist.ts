import { BaseTrace, Trace } from '@voiceflow/base-types';
import { ChatCompletionRequestMessageRoleEnum } from '@voiceflow/openai';

import { sanitizeSSML } from '@/lib/services/filter/utils';
import { isIntentRequest, isTextRequest, RuntimeRequest } from '@/lib/services/runtime/types';
import { Store } from '@/runtime';
import { Context, ContextHandler } from '@/types';

import { AbstractManager } from './utils';

const MAX_TURNS = 10;

export type AIAssistLog = { role: ChatCompletionRequestMessageRoleEnum; content: string }[];

// writes a primative string aiAssistTranscript into the context state storage
class AIAssist extends AbstractManager implements ContextHandler {
  static StorageKey = '_memory_';

  static getInput(request: RuntimeRequest) {
    return (isIntentRequest(request) && request.payload.query) || (isTextRequest(request) && request.payload) || null;
  }

  static injectOutput(variables: Store, trace: BaseTrace.TextTrace | BaseTrace.SpeakTrace) {
    const transcript = (variables.get(AIAssist.StorageKey) as AIAssistLog) || [];

    const lastTranscript = transcript[transcript.length - 1];

    const content = trace.type === Trace.TraceType.SPEAK ? sanitizeSSML(trace.payload.message) : trace.payload.message;

    if (lastTranscript?.role === ChatCompletionRequestMessageRoleEnum.Assistant) {
      lastTranscript.content += `\n${content}`;
    } else {
      transcript.push({ role: ChatCompletionRequestMessageRoleEnum.Assistant, content });
      if (transcript.length > MAX_TURNS) transcript.shift();
    }

    variables.set(AIAssist.StorageKey, transcript);
  }

  handle = async (context: Context) => {
    if (!context.version?.projectID) return context;

    const { request } = context;

    const input = AIAssist.getInput(request);
    const transcript: AIAssistLog = context.state.variables[AIAssist.StorageKey] || [];

    if (input) {
      const transcript: AIAssistLog = context.state.variables[AIAssist.StorageKey] || [];
      transcript.push({ role: ChatCompletionRequestMessageRoleEnum.User, content: input });

      if (transcript.length > MAX_TURNS) transcript.shift();
    }

    return {
      ...context,
      state: {
        ...context.state,
        variables: {
          ...context.state.variables,
          [AIAssist.StorageKey]: transcript,
        },
      },
    };
  };
}

export default AIAssist;
