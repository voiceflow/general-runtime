import { BaseUtils } from '@voiceflow/base-types';

import { fetchChat } from '../ai';

export const questionSynthesis = async (question: string, memory: BaseUtils.ai.Message[]): Promise<string> => {
  if (memory.length > 1) {
    const contextMessages: BaseUtils.ai.Message[] = [...memory];

    if (memory[memory.length - 1].content === question) {
      contextMessages.push({
        role: BaseUtils.ai.Role.USER,
        content: 'frame the statement above so that it can be asked as a question to someone with no context.',
      });
    } else {
      contextMessages.push({
        role: BaseUtils.ai.Role.USER,
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
