/* eslint-disable sonarjs/no-nested-template-literals */
import { BaseUtils } from '@voiceflow/base-types';
import dedent from 'dedent';

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

export const promptQuestionSynthesis = async ({
  prompt,
  memory,
  variables,
  options: { model = BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo, system = '', temperature, maxTokens } = {},
}: {
  prompt: string;
  memory: BaseUtils.ai.Message[];
  variables?: Record<string, any>;
  options?: Partial<BaseUtils.ai.AIModelParams>;
}): Promise<string | null> => {
  const options = { model, system, temperature, maxTokens };

  const questionMessages: BaseUtils.ai.Message[] = [
    {
      role: BaseUtils.ai.Role.USER,
      content: dedent`
      <Conversation_History>
        ${memory.map((turn) => `${turn.role}: ${turn.content}`)}
      </Conversation_History>

      <Instructions>${prompt}</Instructions>

      You can search a text knowledge base to fulfill <Instructions> based on <Conversation_History>. Write a sentence to search against:`,
    },
  ];

  const response = await fetchChat({ ...options, messages: questionMessages }, variables);

  return response.output;
};
