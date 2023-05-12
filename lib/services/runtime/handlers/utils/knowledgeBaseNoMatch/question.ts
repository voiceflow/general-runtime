import { BaseUtils } from '@voiceflow/base-types';

import { fetchChat, Message } from '../ai';

export const questionSynthesis = async (question: string, memory: Message[]): Promise<string> => {
  if (memory.length > 1) {
    const contextMessages: Message[] = [...memory];

    if (memory[memory.length - 1].content === question) {
      contextMessages.push({
        role: 'user',
        content: 'frame the statement above so that it can be asked as a question to someone with no context.',
      });
    } else {
      contextMessages.push({
        role: 'user',
        content: `Based on our conversation, frame this statement: "${question}", so that it can be asked as a question to someone with no context.`,
      });
    }

    const response = await fetchChat({
      temperature: 0.1,
      maxTokens: 128,
      model: BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo,
      messages: contextMessages,
    });

    if (response.output) return response.output;
  }

  return question;
};
