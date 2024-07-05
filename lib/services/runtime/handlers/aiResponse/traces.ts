import { BaseTrace } from '@voiceflow/base-types';
import { CompletionPrivateHTTPControllerGenerateChatCompletionStream200 } from '@voiceflow/sdk-http-ml-gateway/generated';
import { VoiceNode } from '@voiceflow/voice-types';

import { Runtime } from '@/runtime';

import { isChatProject } from '../utils/output';
import { getVersionDefaultVoice } from '../utils/version';

export const completionToStartTrace = (
  runtime: Runtime,
  node: VoiceNode.AIResponse.Node,
  completion: CompletionPrivateHTTPControllerGenerateChatCompletionStream200
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
  time: Date.now(),
});

export const completionToContinueTrace = (
  completion: CompletionPrivateHTTPControllerGenerateChatCompletionStream200
): BaseTrace.CompletionContinueTrace => ({
  type: BaseTrace.TraceType.COMPLETION_CONTINUE,
  payload: {
    completion: completion.output!,
    tokens: {
      answer: completion.answerTokens,
      query: completion.queryTokens,
      total: completion.tokens,
    },
  },
  time: Date.now(),
});

export const endTrace = (): BaseTrace.CompletionEndTrace => ({
  type: BaseTrace.TraceType.COMPLETION_END,
  payload: {},
  time: Date.now(),
});
