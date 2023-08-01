import { BaseModels, BaseUtils } from '@voiceflow/base-types';
import axios from 'axios';

import Config from '@/config';
import AIAssist from '@/lib/services/aiAssist';
import log from '@/logger';
import { Runtime } from '@/runtime';

import { Output } from '../../../types';
import { getMemoryMessages } from '../ai';
import { generateOutput } from '../output';
import { answerSynthesis, promptAnswerSynthesis } from './answer';
import { promptQuestionSynthesis, questionSynthesis } from './question';

export { answerSynthesis, questionSynthesis };

export interface KnowledegeBaseChunk {
  score: number;
  chunkID: string;
  documentID: string;
  content: string;
}

export interface KnowledgeBaseResponse {
  chunks: KnowledegeBaseChunk[];
}

export const FLAGGED_WORSPACE_IDS = ['80627', 'Brk8AaGjlQ'];

const { KL_RETRIEVER_SERVICE_HOST: host, KL_RETRIEVER_SERVICE_PORT: port } = Config;
const scheme = process.env.NODE_ENV === 'e2e' ? 'https' : 'http';
export const RETRIEVE_ENDPOINT = host && port ? new URL(`${scheme}://${host}:${port}/retrieve`).href : null;
export const { KNOWLEDGE_BASE_LAMBDA_ENDPOINT } = Config;

export const getAnswerEndpoint = (workspaceID: string | undefined): string | null => {
  if (workspaceID && FLAGGED_WORSPACE_IDS.includes(String(workspaceID))) {
    return RETRIEVE_ENDPOINT;
  }
  if (!KNOWLEDGE_BASE_LAMBDA_ENDPOINT) return null;
  return `${KNOWLEDGE_BASE_LAMBDA_ENDPOINT}/answer`;
};

export const fetchKnowledgeBase = async (
  projectID: string,
  workspaceID: string | undefined,
  question: string,
  settings?: BaseModels.Project.KnowledgeBaseSettings
): Promise<KnowledgeBaseResponse | null> => {
  try {
    const answerEndpoint = getAnswerEndpoint(workspaceID);

    if (!answerEndpoint) return null;

    const { data } = await axios.post<KnowledgeBaseResponse>(answerEndpoint, {
      projectID,
      question,
      settings,
    });

    if (!data?.chunks?.length) return null;

    return data;
  } catch (err) {
    log.error(`[fetchKnowledgeBase] ${log.vars({ err })}`);
    return null;
  }
};

export const knowledgeBaseNoMatch = async (
  runtime: Runtime
): Promise<{ output: Output; tokens: number; time: number } | null> => {
  if (!RETRIEVE_ENDPOINT || !KNOWLEDGE_BASE_LAMBDA_ENDPOINT) {
    log.error('[knowledgeBase] one of RETRIEVE_ENDPOINT or KNOWLEDGE_BASE_LAMBDA_ENDPOINT is null');
    return null;
  }

  if (!runtime.project?._id) return null;

  const input = AIAssist.getInput(runtime.getRequest());
  if (!input) return null;

  try {
    let tokens = 0;
    let time = 0;
    // expiremental module, frame the question
    const memory = getMemoryMessages(runtime.variables.getState());

    const question = await questionSynthesis(input, memory);
    if (!question?.output) return null;

    const queryTokens = question.tokens ?? 0;
    tokens += queryTokens;

    const data = await fetchKnowledgeBase(
      runtime.project._id,
      runtime.project.teamID,
      question.output,
      runtime.project?.knowledgeBase?.settings
    );
    if (!data) return null;

    const answer = await answerSynthesis({
      question: question.output,
      data,
      options: runtime.project?.knowledgeBase?.settings?.summarization,
      variables: runtime.variables.getState(),
    });
    if (!answer?.output) return null;

    tokens += answer.tokens ?? 0;
    time += answer.time ?? 0;

    const documents = runtime.project?.knowledgeBase?.documents || {};

    runtime.trace.addTrace({
      type: 'knowledgeBase',
      payload: {
        chunks: data.chunks.map(({ score, documentID }) => ({
          score,
          documentID,
          documentData: documents[documentID]?.data,
        })),
        query: {
          messages: question.messages,
          output: question.output,
          tokenInfo: {
            tokens: question.tokens,
            queryTokens: question.queryTokens,
            answerTokens: question.answerTokens,
          },
        },
        synthesis: {
          output: answer.output,
          tokenInfo: {
            tokens: answer.tokens,
            queryTokens: answer.queryTokens,
            answerTokens: answer.answerTokens,
          },
        },
      },
    } as any);

    return {
      output: generateOutput(answer.output, runtime.project),
      tokens,
      time,
    };
  } catch (err) {
    log.error(`[knowledge-base no match] ${log.vars({ err })}`);
    return null;
  }
};

export const promptSynthesis = async (
  projectID: string,
  workspaceID: string | undefined,
  params: BaseUtils.ai.AIContextParams & BaseUtils.ai.AIModelParams,
  variables: Record<string, any>,
  runtime?: Runtime
) => {
  try {
    const { prompt } = params;

    const memory = getMemoryMessages(variables);

    const query = await promptQuestionSynthesis({ prompt, variables, memory });
    if (!query || !query.output) return null;

    const data = await fetchKnowledgeBase(projectID, workspaceID, query.output);

    if (!data) return null;

    const answer = await promptAnswerSynthesis({
      prompt,
      options: params,
      data,
      memory,
      variables,
    });

    if (!answer?.output) return null;

    if (runtime) {
      runtime.trace.addTrace({
        type: 'knowledgeBase',
        payload: {
          chunks: data.chunks.map(({ score, documentID }) => ({
            score,
            documentID,
            documentData: runtime.project?.knowledgeBase?.documents[documentID]?.data,
          })),
          query: {
            messages: query.messages,
            output: query.output,
            tokenInfo: {
              tokens: query.tokens,
              queryTokens: query.queryTokens,
              answerTokens: query.answerTokens,
            },
          },
          synthesis: {
            output: answer.output,
            tokenInfo: {
              tokens: answer.tokens,
              queryTokens: answer.queryTokens,
              answerTokens: answer.answerTokens,
            },
          },
        },
      } as any);
    }

    const tokens = query.tokens + answer.tokens;
    const time = query.time + answer.time;

    return { ...answer, ...data, query, tokens, time };
  } catch (err) {
    log.error(`[knowledge-base prompt] ${log.vars({ err })}`);
    return null;
  }
};
