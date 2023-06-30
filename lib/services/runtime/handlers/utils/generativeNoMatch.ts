import { BaseUtils } from '@voiceflow/base-types';

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
  const messages: BaseUtils.ai.Message[] = [
    ...getMemoryMessages(runtime.variables.getState()),
    {
      role: BaseUtils.ai.Role.SYSTEM,
      content: `${context.system || ''}\n\n${getCurrentTime()}`.trim(),
    },
  ];

  const { output, tokens } = await fetchChat({ ...context, messages });
  if (!output) return null;

  return {
    output: generateOutput(output, runtime.project),
    tokens: tokens ?? 0,
  };
};
