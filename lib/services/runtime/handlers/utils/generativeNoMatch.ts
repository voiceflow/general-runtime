import { BaseUtils } from '@voiceflow/base-types';

import { GPT4_ABLE_PLAN } from '@/lib/clients/ai/ai-model.interface';
import { Runtime } from '@/runtime';

import { AIResponse, EMPTY_AI_RESPONSE, fetchChat, getMemoryMessages } from './ai';

// get current UTC time, default to 1 newline after
export const getCurrentTime = ({ newlines = 1 }: { newlines?: number } = {}) => {
  return `Current time: ${new Date().toUTCString()}${newlines ? '\n'.repeat(newlines) : ''}`;
};

export const generateNoMatch = async (
  runtime: Runtime,
  context: BaseUtils.ai.AIModelParams
): Promise<AIResponse | null> => {
  if (
    context.model === BaseUtils.ai.GPT_MODEL.GPT_4 &&
    runtime.plan &&
    !GPT4_ABLE_PLAN.has(runtime.plan)
  ) {
    return {
      ...EMPTY_AI_RESPONSE,
      output: 'GPT-4 is only available on the Pro plan. Please upgrade to use this feature.',
    };
  }

  const messages: BaseUtils.ai.Message[] = [
    ...getMemoryMessages(runtime.variables.getState()),
    {
      role: BaseUtils.ai.Role.SYSTEM,
      content: `${context.system || ''}\n\n${getCurrentTime()}`.trim(),
    },
  ];

  // system injected as the most recent message
  const response = await fetchChat(
    { ...context, system: undefined, messages },
    runtime.services.mlGateway,
    {
      context: {
        projectID: runtime.project?._id,
        workspaceID: runtime.project!.teamID,
      },
    }
  );

  if (!response.output) return null;

  return {
    ...response,
    output: response.output,
    tokens: response.tokens ?? 0,
    queryTokens: response.queryTokens ?? 0,
    answerTokens: response.answerTokens ?? 0,
  };
};
