import { BaseTrace } from '@voiceflow/base-types';
import { VoiceNode } from '@voiceflow/voice-types';

import { Runtime } from '@/runtime';

import { AIResponse } from '../utils/ai';
import { isChatProject } from '../utils/output';
import { getVersionDefaultVoice } from '../utils/version';

export const completionToStartTrace = (
  runtime: Runtime,
  node: VoiceNode.AIResponse.Node,
  completion: AIResponse
): BaseTrace.CompletionStartTrace => ({
  type: BaseTrace.TraceType.COMPLETION_START,
  payload: {
    completion: completion.output!,
    ...(!isChatProject(runtime.project) && {
      voice: node.voice ?? getVersionDefaultVoice(runtime.version),
    }),
    type: !isChatProject(runtime.project) ? BaseTrace.TraceType.SPEAK : BaseTrace.TraceType.TEXT,
    tokens: {
      model: completion.model,
      answer: completion.answerTokens,
      query: completion.queryTokens,
      total: completion.tokens,
    },
  },
});

export const completionToContinueTrace = (completion: AIResponse): BaseTrace.CompletionContinueTrace => ({
  type: BaseTrace.TraceType.COMPLETION_CONTINUE,
  payload: {
    completion: completion.output!,
    tokens: {
      answer: completion.answerTokens,
      query: completion.queryTokens,
      total: completion.tokens,
    },
  },
});

export const endTrace = (): BaseTrace.CompletionEndTrace => ({
  type: BaseTrace.TraceType.COMPLETION_END,
  payload: {},
});
