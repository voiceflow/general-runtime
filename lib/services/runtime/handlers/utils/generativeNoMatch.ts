import { BaseUtils } from '@voiceflow/base-types';

import { GPT4_ABLE_PLAN } from '@/lib/clients/ai/types';
import { Runtime } from '@/runtime';

import { Output } from '../../types';
import { fetchChat, getMemoryMessages } from './ai';
import { generateOutput } from './output';

// get current UTC time, default to 1 newline after
export const getCurrentTime = ({ newlines = 1 }: { newlines?: number } = {}) => {
  return `Current time: ${new Date().toUTCString()}${newlines ? '\n'.repeat(newlines) : ''}`;
};

export const generateNoMatch = async (
  runtime: Runtime,
  context: BaseUtils.ai.AIModelParams
): Promise<{ output: Output; tokens: number } | null> => {
  if (context.model === BaseUtils.ai.GPT_MODEL.GPT_4 && runtime.plan && !GPT4_ABLE_PLAN.has(runtime.plan)) {
    return {
      output: generateOutput(
        'GPT-4 is only available on the Pro plan. Please upgrade to use this feature.',
        runtime.project
      ),
      tokens: 0,
    };
  }

  const messages: BaseUtils.ai.Message[] = [
    ...getMemoryMessages(runtime.variables.getState()),
    {
      role: BaseUtils.ai.Role.SYSTEM,
      content: `${context.system || ''}\n\n${getCurrentTime()}`.trim(),
    },
  ];

  const response = await fetchChat({ ...context, messages });
  if (!response.output) return null;

  runtime.trace.addTrace({
    type: 'genAI',
    payload: {
      output: response.output,
      tokenInfo: {
        tokens: response.tokens,
        queryTokens: response.queryTokens,
        answerTokens: response.answerTokens,
      },
    },
  } as any);

  return {
    output: generateOutput(response.output, runtime.project),
    tokens: response.tokens ?? 0,
  };
};
