import { BaseModels } from '@voiceflow/base-types';
import axios from 'axios';

import Config from '@/config';
import AIAssist from '@/lib/services/aiAssist';
import log from '@/logger';
import { Runtime } from '@/runtime';

import { Output } from '../../../types';
import { getMemoryMessages } from '../ai';
import { generateOutput } from '../output';
import { answerSynthesis } from './answer';
import { questionSynthesis } from './question';

export interface KnowledegeBaseChunk {
  score: number;
  chunkID: string;
  documentID: string;
  content: string;
}
export interface KnowledgeBaseResponse {
  chunks: KnowledegeBaseChunk[];
}

export const fetchKnowledgeBase = async (
  projectID: string,
  question: string,
  settings?: BaseModels.Project.KnowledgeBaseSettings
): Promise<KnowledgeBaseResponse | null> => {
  const { KNOWLEDGE_BASE_LAMBDA_ENDPOINT } = Config;
  if (!KNOWLEDGE_BASE_LAMBDA_ENDPOINT) return null;

  const answerEndpoint = `${KNOWLEDGE_BASE_LAMBDA_ENDPOINT}/answer`;

  const { data } = await axios.post<KnowledgeBaseResponse>(answerEndpoint, {
    projectID,
    question,
    settings,
  });

  if (!data?.chunks?.length) return null;

  return data;
};

export const knowledgeBaseNoMatch = async (runtime: Runtime): Promise<Output | null> => {
  if (!Config.KNOWLEDGE_BASE_LAMBDA_ENDPOINT) {
    log.error('[knowledgeBase] KNOWLEDGE_BASE_LAMBDA_ENDPOINT is not set');
    return null;
  }

  const input = AIAssist.getInput(runtime.getRequest());
  if (!input) return null;

  try {
    // expiremental module, frame the question
    const memory = getMemoryMessages(runtime.variables.getState());

    const question = await questionSynthesis(input, memory);

    if (!runtime.project?._id) return null;

    const data = await fetchKnowledgeBase(runtime.project._id, question, runtime.project?.knowledgeBase?.settings);
    if (!data) return null;

    const answer = await answerSynthesis({
      question,
      data,
      options: runtime.project?.knowledgeBase?.settings?.summarization,
      variables: runtime.variables.getState(),
    });
    if (!answer?.output) return null;

    const { output, ...meta } = answer;

    const documents = runtime.project?.knowledgeBase?.documents || {};

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
