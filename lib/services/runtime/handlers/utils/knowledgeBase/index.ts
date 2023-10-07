import { BaseModels, BaseUtils } from '@voiceflow/base-types';
import axios from 'axios';

import Config from '@/config';
import AIAssist from '@/lib/services/aiAssist';
import log from '@/logger';
import { Runtime } from '@/runtime';

import { Output } from '../../../types';
import { AIResponse, getMemoryMessages } from '../ai';
import { generateOutput } from '../output';
import { answerSynthesis, promptAnswerSynthesis } from './answer';
import { promptQuestionSynthesis, questionSynthesis } from './question';
import { CloudEnv } from './types';

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

export interface KnowledgeBaseFaq {
  question?: string;
  answer?: string;
}

export interface KnowledgeBaseFaqResponse {
  faq: KnowledgeBaseFaq | null;
}

const FLAGGED_WORKSPACES_MAP = new Map<string, string[]>([
  [CloudEnv.Public, []],
  [CloudEnv.USBank, []],
  [CloudEnv.VFTEST76, []],
  [CloudEnv.CISCO, []],
  [CloudEnv.JPMC, []],
]);

const FAQ_FLAGGED_WORKSPACES_MAP = new Map<string, string[]>([[CloudEnv.Public, ['28']]]);

const { KL_RETRIEVER_SERVICE_HOST: host, KL_RETRIEVER_SERVICE_PORT: port } = Config;
const scheme = process.env.NODE_ENV === 'e2e' ? 'https' : 'http';
export const RETRIEVE_ENDPOINT = host && port ? new URL(`${scheme}://${host}:${port}/retrieve`).href : null;
export const FAQ_RETRIEVAL_ENDPOINT =
  host && port ? new URL(`${scheme}://${host}:${port}/poc/retrieve/faq`).href : null;
export const { KNOWLEDGE_BASE_LAMBDA_ENDPOINT } = Config;

export const getAnswerEndpoint = (cloudEnv: string, workspaceID: string): string | null => {
  // check if env/workspace pair is flagged, if flagged workspaces list is empty, accept them all
  const flaggedWorkspaces = FLAGGED_WORKSPACES_MAP.get(cloudEnv);
  if (flaggedWorkspaces?.length === 0 || flaggedWorkspaces?.includes(String(workspaceID))) {
    return RETRIEVE_ENDPOINT;
  }

  if (!KNOWLEDGE_BASE_LAMBDA_ENDPOINT) return null;
  return `${KNOWLEDGE_BASE_LAMBDA_ENDPOINT}/answer`;
};

export const fetchFaq = async (
  projectID: string,
  workspaceID: string | undefined,
  question: string,
  settings?: BaseModels.Project.KnowledgeBaseSettings
): Promise<KnowledgeBaseFaq | null> => {
  const cloudEnv = Config.CLOUD_ENV || '';
  const flaggedWorkspaces = FAQ_FLAGGED_WORKSPACES_MAP.get(cloudEnv);

  if (FAQ_RETRIEVAL_ENDPOINT && (flaggedWorkspaces?.length === 0 || flaggedWorkspaces?.includes(String(workspaceID)))) {
    const { data } = await axios.post<KnowledgeBaseFaqResponse>(FAQ_RETRIEVAL_ENDPOINT, {
      projectID,
      workspaceID,
      question,
      settings,
    });
    return data?.faq;
  }

  return null;
};

const addFaqTrace = (runtime: Runtime, faq: KnowledgeBaseFaq, question: AIResponse) => {
  runtime.trace.addTrace({
    type: 'knowledgeBase',
    payload: {
      faqQuestion: faq?.question,
      faqAnswer: faq?.answer,
      query: {
        messages: question.messages,
        output: question.output,
      },
    },
  } as any);
};

export const fetchKnowledgeBase = async (
  projectID: string,
  workspaceID: string | undefined,
  question: string,
  settings?: BaseModels.Project.KnowledgeBaseSettings,
  tags?: BaseModels.Project.KnowledgeBaseTagsFilter
): Promise<KnowledgeBaseResponse | null> => {
  try {
    const cloudEnv = Config.CLOUD_ENV || '';
    const answerEndpoint = getAnswerEndpoint(cloudEnv, workspaceID || '');

    if (!answerEndpoint) return null;

    const { data } = await axios.post<KnowledgeBaseResponse>(answerEndpoint, {
      projectID,
      workspaceID,
      question,
      settings,
      tags,
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
): Promise<{ output?: Output; tokens: number; queryTokens: number; answerTokens: number } | null> => {
  if (!RETRIEVE_ENDPOINT || !KNOWLEDGE_BASE_LAMBDA_ENDPOINT) {
    log.error('[knowledgeBase] one of RETRIEVE_ENDPOINT or KNOWLEDGE_BASE_LAMBDA_ENDPOINT is null');
    return null;
  }

  if (!runtime.project?._id) return null;

  const input = AIAssist.getInput(runtime.getRequest());
  if (!input) return null;

  try {
    // expiremental module, frame the question
    const memory = getMemoryMessages(runtime.variables.getState());

    const question = await questionSynthesis(input, memory);
    if (!question?.output) return null;

    // before checking KB, check if it is an FAQ
    const faq = await fetchFaq(
      runtime.project._id,
      runtime.project.teamID,
      question.output,
      runtime.project?.knowledgeBase?.settings
    );
    if (faq?.answer) {
      addFaqTrace(runtime, faq, question);
      return {
        output: generateOutput(faq.answer, runtime.project),
        tokens: question.queryTokens + question.answerTokens,
        queryTokens: question.queryTokens,
        answerTokens: question.answerTokens,
      };
    }

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

    if (!answer) return null;

    const queryTokens = question.queryTokens + answer.queryTokens;
    const answerTokens = question.answerTokens + answer.answerTokens;
    const tokens = queryTokens + answerTokens;

    // KB NOT_FOUND still uses tokens
    if (!answer.output) return { tokens, queryTokens, answerTokens };

    // only add KB trace if result is success
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
        },
      },
    } as any);

    return {
      output: generateOutput(answer.output, runtime.project),
      tokens,
      queryTokens,
      answerTokens,
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

    // before checking KB, check if it is an FAQ
    const faq = await fetchFaq(projectID, workspaceID, query.output, runtime?.project?.knowledgeBase?.settings);
    if (faq?.answer) {
      if (runtime) {
        addFaqTrace(runtime, faq, query);
      }

      return {
        output: faq.answer,
        tokens: query.queryTokens + query.answerTokens,
        queryTokens: query.queryTokens,
        answerTokens: query.answerTokens,
      };
    }

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
          },
        },
      } as any);
    }

    const tokens = (query.tokens ?? 0) + (answer.tokens ?? 0);

    const queryTokens = query.queryTokens + answer.queryTokens;
    const answerTokens = query.answerTokens + answer.answerTokens;

    return { ...answer, ...data, query, tokens, queryTokens, answerTokens };
  } catch (err) {
    log.error(`[knowledge-base prompt] ${log.vars({ err })}`);
    return null;
  }
};
