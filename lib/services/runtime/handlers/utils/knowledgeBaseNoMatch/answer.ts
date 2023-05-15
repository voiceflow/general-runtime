import { BaseUtils } from '@voiceflow/base-types';

import { AIResponse, fetchChat, fetchPrompt } from '../ai';
import { getCurrentTime } from '../generativeNoMatch';

interface KnowledegeBaseChunk {
  score: number;
  chunkID: string;
  documentID: string;
  originalText: string;
}
interface KnowledgeBaseResponse {
  chunks: KnowledegeBaseChunk[];
}

export const answerSynthesis = async ({
  question,
  data,
  variables,
  options: { model = BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo, system, temperature, maxTokens } = {},
}: {
  question: string;
  data: KnowledgeBaseResponse;
  variables?: Record<string, any>;
  options?: Partial<BaseUtils.ai.AIModelParams>;
}): Promise<AIResponse | null> => {
  let response: AIResponse;

  const systemWithTime = `${system}\n\n${getCurrentTime()}`.trim();

  const options = { model, system: systemWithTime, temperature, maxTokens };

  const context = data.chunks.map(({ originalText }) => originalText).join('\n');

  if (!BaseUtils.ai.ChatModels.includes(options.model)) {
    // for GPT-3 completion model
    const prompt = `context:\n${context}\n\nIf you don't know the answer say exactly "NOT_FOUND".\n\nQ: ${question}\nA: `;

    response = await fetchPrompt({ ...options, prompt, mode: BaseUtils.ai.PROMPT_MODE.PROMPT }, variables);
  } else {
    // for GPT-3.5 and 4.0 chat models
    const messages = [
      {
        role: 'user' as const,
        content: `context:\n${context}`,
      },
      {
        role: 'user' as const,
        content: `If you don't know the answer say exactly "NOT_FOUND".\n\n${question}`,
      },
    ];

    response = await fetchChat({ ...options, messages }, variables);
  }

  const output = response.output?.trim().toUpperCase();

  if (output?.includes('NOT_FOUND') || output?.startsWith("I'M SORRY,") || output?.includes('AS AN AI'))
    return { ...response, output: null };

  return response;
};
