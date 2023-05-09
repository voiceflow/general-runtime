/* eslint-disable sonarjs/cognitive-complexity */
import { BaseUtils } from '@voiceflow/base-types';
import axios from 'axios';

import Config from '@/config';
import AIAssist from '@/lib/services/aiAssist';
import log from '@/logger';
import { Runtime } from '@/runtime';

import { Output } from '../../types';
import { fetchChat, fetchPrompt, getMemoryMessages, Message } from './ai';
import { generateOutput } from './output';

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
  return chunks.map((chunk) => `"${chunk.originalText}"\n\n`).join('');
};

export const knowledgeBaseNoMatch = async (runtime: Runtime): Promise<Output | null> => {
  // if no documents in knowledge base, ignore
  if (!Object.values(runtime.project?.knowledgeBase?.documents || {}).length) {
    return null;
  }

  if (!Config.KNOWLEDGE_BASE_LAMBDA_ENDPOINT) {
    log.error('[knowledgeBase] KNOWLEDGE_BASE_LAMBDA_ENDPOINT is not set');
    return null;
  }

  const { KNOWLEDGE_BASE_LAMBDA_ENDPOINT } = Config;
  const answerEndpoint = `${KNOWLEDGE_BASE_LAMBDA_ENDPOINT}/answer`;

  const inputUtterance = AIAssist.getInput(runtime.getRequest());
  if (!inputUtterance) return null;

  try {
    // expiremental module, frame the question
    const memory = getMemoryMessages(runtime.variables.getState());

    // add question mark if not present
    let question = inputUtterance;

    if (memory.length > 1) {
      const contextMessages: Message[] = [
        ...memory,
        {
          role: 'user',
          content: 'frame the statement above so that it can be asked as a question to someone with no context.',
        },
      ];
      const response = await fetchChat({
        temperature: 0.1,
        maxTokens: 128,
        model: BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo,
        messages: contextMessages,
      });

      if (response.output) {
        question = response.output;
      }
    }

    const { data } = await axios.post<KnowledgeBaseResponse>(answerEndpoint, {
      projectID: runtime.project?._id,
      question,
      settings: runtime.project?.knowledgeBase?.settings,
    });

    if (!data?.chunks?.length) return null;

    const summarization = runtime.project?.knowledgeBase?.settings?.summarization;
    const options = { ...summarization, model: summarization?.model || BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo };

    // if the user injects a custom prompt
    let prompt = summarization?.prompt ? `${summarization.prompt}\n` : '';
    let response: { output: string | null };

    const variables = runtime.variables.getState();

    if (!BaseUtils.ai.ChatModels.includes(options.model)) {
      // for GPT-3 completion model
      prompt += `reference info:\n\n${createKnowledgeString(data)}\n\nQ: ${question}\nA: `;

      response = await fetchPrompt({ ...options, prompt, mode: BaseUtils.ai.PROMPT_MODE.PROMPT }, variables);
    } else {
      // for GPT-3.5 and 4.0 chat models

      prompt += `reference info:\n\n${createKnowledgeString(data)}\n\n`;

      const system = (options.system ? `${options.system}\n` : '') + prompt;

      // TODO: memory depends on the size of the prompt
      response = await fetchChat({ ...options, system, messages: memory }, variables);
    }

    const { output, ...meta } = response;

    const documents = runtime.project?.knowledgeBase?.documents || {};

    if (!output) return null;

    runtime.trace.addTrace({
      type: 'knowledgeBase',
      payload: {
        chunks: data.chunks.map(({ score, documentID }) => ({
          score,
          documentID,
          documentData: documents[documentID]?.data,
        })),
        query: question,
        ...meta,
      },
    } as any);

    return generateOutput(output, runtime.project);
  } catch (err) {
    log.error(`[knowledgeBase] ${log.vars({ err })}`);
    return null;
  }
};
