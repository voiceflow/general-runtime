import { BaseUtils } from '@voiceflow/base-types';

import { Runtime } from '@/runtime';

import { Output } from '../../types';
import { fetchChat, getMemoryMessages, Message } from './ai';
import { generateOutput } from './output';

// get current UTC time, default to 1 newline after
export const getCurrentTime = ({ newlines = 1 }: { newlines?: number } = {}) => {
  return `Current time: ${new Date().toUTCString()}${newlines ? '\n'.repeat(newlines) : ''}`;
};

export const generateNoMatch = async (
  runtime: Runtime,
  context: BaseUtils.ai.AIModelParams
): Promise<Output | null> => {
  const messages: Message[] = [
    ...getMemoryMessages(runtime.variables.getState()),
    {
      role: 'system',
      content: `${context.system || ''}\n\n${getCurrentTime()}`.trim(),
    },
  ];

  const { output } = await fetchChat({ ...context, messages });

  return output && generateOutput(output, runtime.project);
};
