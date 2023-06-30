import { BaseUtils } from '@voiceflow/base-types';
import dedent from 'dedent';

import { AIResponse, fetchChat } from '../ai';

export const questionSynthesis = async (question: string, memory: BaseUtils.ai.Message[]): Promise<AIResponse> => {
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

    if (response.output) return response;
  }

  return {
    output: question,
  };
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
}): Promise<AIResponse> => {
  const options = { model, system, temperature, maxTokens };

  let content: string;

  if (memory.length) {
    const history = memory.map((turn) => `${turn.role}: ${turn.content}`).join('\n');
    content = dedent`
    <Conversation_History>
      ${history}
    </Conversation_History>

    <Instructions>${prompt}</Instructions>

    Using <Conversation_History> as context, you are searching a text knowledge base to fulfill <Instructions>. Write a sentence to search against.`;
  } else {
    content = dedent`
    <Instructions>${prompt}</Instructions>

    You can search a text knowledge base to fulfill <Instructions>. Write a sentence to search against.`;
  }

  const questionMessages: BaseUtils.ai.Message[] = [
    {
      role: BaseUtils.ai.Role.USER,
      content,
    },
  ];

  return fetchChat({ ...options, messages: questionMessages }, variables);
};
