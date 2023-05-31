import { BaseUtils } from '@voiceflow/base-types';

import { AIResponse, fetchChat, fetchPrompt } from '../ai';
import { getCurrentTime } from '../generativeNoMatch';
import type { KnowledgeBaseResponse } from '.';

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
  let response: AIResponse;

  const systemWithTime = `${system}\n\n${getCurrentTime()}`.trim();

  const options = { model, system: systemWithTime, temperature, maxTokens };

  const context = data.chunks.map(({ content }) => content).join('\n');

  if (!BaseUtils.ai.ChatModels.includes(options.model)) {
    // for GPT-3 completion model
    const prompt = `context:\n${context}\n\nIf you don't know the answer say exactly "NOT_FOUND".\n\nQ: ${question}\nA: `;

    response = await fetchPrompt({ ...options, prompt, mode: BaseUtils.ai.PROMPT_MODE.PROMPT }, variables);
  } else {
    // for GPT-3.5 and 4.0 chat models
    const messages = [
      {
        role: BaseUtils.ai.Role.SYSTEM,
        content: `context:\n${context}`,
      },
      {
        role: BaseUtils.ai.Role.USER,
        content: `Answer the following question using ONLY the provided context, if you don't know the answer say exactly "NOT_FOUND".\n\nQuestion:\n${question}`,
      },
    ];

    response = await fetchChat({ ...options, messages }, variables);
  }

  const output = response.output?.trim().toUpperCase();

  if (output?.includes('NOT_FOUND') || output?.startsWith("I'M SORRY,") || output?.includes('AS AN AI'))
    return { output: null };

  return { output: response.output };
};
