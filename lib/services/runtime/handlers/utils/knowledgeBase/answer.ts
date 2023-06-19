import { BaseUtils } from '@voiceflow/base-types';
import dedent from 'dedent';

import { AIResponse, fetchChat, fetchPrompt } from '../ai';
import { getCurrentTime } from '../generativeNoMatch';
import type { KnowledgeBaseResponse } from '.';

const generateContext = (data: KnowledgeBaseResponse) => {
  return data.chunks.map(({ content }, index) => `<${index + 1}>${content}</${index + 1}>`).join('\n');
};

export const answerSynthesis = async ({
  question,
  data,
  variables,
  options: { model = BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo, system = '', temperature, maxTokens } = {},
}: {
  question: string;
  data: KnowledgeBaseResponse;
  variables?: Record<string, any>;
  options?: Partial<BaseUtils.ai.AIModelParams>;
}): Promise<AIResponse | null> => {
  let response: AIResponse = { output: null };

  const systemWithTime = `${system}\n\n${getCurrentTime()}`.trim();

  const options = { model, system: systemWithTime, temperature, maxTokens };

  const context = generateContext(data);

  if ([BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo, BaseUtils.ai.GPT_MODEL.GPT_4].includes(model)) {
    // for GPT-3.5 and 4.0 chat models
    const messages = [
      {
        role: BaseUtils.ai.Role.SYSTEM,
        content: dedent`
          <context>
            ${context}
          </context>
        `,
      },
      {
        role: BaseUtils.ai.Role.USER,
        content: dedent`
          Answer the following question using ONLY the provided <context>, if you don't know the answer say exactly "NOT_FOUND".

          Question:
          ${question}
        `,
      },
    ];

    response = await fetchChat({ ...options, messages }, variables);
  } else if ([BaseUtils.ai.GPT_MODEL.DaVinci_003].includes(model)) {
    // for GPT-3 completion model
    const prompt = dedent`
      <context>
        ${context}
      </context>

      If you don't know the answer say exactly "NOT_FOUND".\n\nQ: ${question}\nA: `;

    response = await fetchPrompt({ ...options, prompt, mode: BaseUtils.ai.PROMPT_MODE.PROMPT }, variables);
  } else if ([BaseUtils.ai.GPT_MODEL.CLAUDE_INSTANT_V1, BaseUtils.ai.GPT_MODEL.CLAUDE_V1].includes(model)) {
    const prompt = dedent`
      Information is provided to help answer the user's questions.
      Using this information and the context from a previous question,
      try to answer in a concise way.

      Use the following info but don't explicitly make reference to using it. Do not use first person in your answer. If you don't know the answer say exactly "NOT_FOUND".

      <information>
        ${context}
      </information>
      <question>${question}</question>`;

    response = await fetchPrompt({ ...options, prompt, mode: BaseUtils.ai.PROMPT_MODE.PROMPT }, variables);
  }

  const output = response.output?.trim().toUpperCase();

  if (output?.includes('NOT_FOUND') || output?.startsWith("I'M SORRY,") || output?.includes('AS AN AI'))
    return { output: null };

  return { output: response.output };
};
