import { BaseUtils } from '@voiceflow/base-types';

import { AIResponse, fetchChat, fetchPrompt } from '../ai';

interface KnowledegeBaseChunk {
  score: number;
  chunkID: string;
  documentID: string;
  originalText: string;
}
interface KnowledgeBaseResponse {
  chunks: KnowledegeBaseChunk[];
}

const createKnowledgeString = ({ chunks }: KnowledgeBaseResponse) => {
  return chunks.map((chunk, index) => `${index + 1}: "${chunk.originalText}"\n\n`).join('');
};

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

  const options = { model, system, temperature, maxTokens };

  if (!BaseUtils.ai.ChatModels.includes(options.model)) {
    // for GPT-3 completion model
    const prompt = `reference info:\n\n${createKnowledgeString(data)}\n\nQ: ${question}\nA: `;

    response = await fetchPrompt({ ...options, prompt, mode: BaseUtils.ai.PROMPT_MODE.PROMPT }, variables);
  } else {
    // for GPT-3.5 and 4.0 chat models

    const refinedQuestion = question.endsWith('?') ? question : `${question}?`;

    const messages = [
      {
        role: 'user' as const,
        content: `reference info:\n\n${createKnowledgeString(
          data
        )}\n\nUse the references to help answer but don't explicitly make reference to the info. If you are uncertain say exactly "NOT_FOUND".`,
      },
      {
        role: 'user' as const,
        content: refinedQuestion,
      },
    ];

    response = await fetchChat({ ...options, messages }, variables);
  }

  if (response.output?.toUpperCase().includes('NOT_FOUND')) return { ...response, output: null };

  return response;
};
