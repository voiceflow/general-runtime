import { BaseModels, BaseNode, BaseTrace } from '@voiceflow/base-types';
import { KnowledgeBaseCtxType } from '@voiceflow/base-types/build/cjs/node/knowledgeBase';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import axios from 'axios';

import Config from '@/config';
import UnleashClient from '@/lib/clients/unleash';
import { FeatureFlag } from '@/lib/feature-flags';
import AIAssist from '@/lib/services/aiAssist';
import log from '@/logger';
import { Runtime } from '@/runtime';

import { AIResponse } from '../ai';
import { CloudEnv } from './types';

export interface KnowledegeBaseChunk {
  score: number;
  chunkID: string;
  documentID: string;
  content: string;
  metadata: object;
}

export interface KnowledgeBaseResponse {
  chunks: KnowledegeBaseChunk[];
}

export interface KnowledgeBaseFaqSet {
  faqSetID?: string;
  name?: string;
}

export interface KnowledgeBaseFaqGeneral {
  question?: string;
  answer?: string;
}

export interface KnowledgeBaseFaq extends KnowledgeBaseFaqGeneral {
  faqSetID?: string;
}

export interface KnowledgeFaqRetrieve extends KnowledgeBaseFaqGeneral {
  faqSet?: KnowledgeBaseFaqSet;
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
  [CloudEnv.VFTESTBR, []],
  [CloudEnv.VFTEST82, []],
  [CloudEnv.GM, []],
  [CloudEnv.VODAFONE, []],
  [CloudEnv.SUPERLOOP, []],
  [CloudEnv.AMAZON, []],
  [CloudEnv.KP, []],
  [CloudEnv.KEYBANK, []],
  [CloudEnv.USAA, []],
  [CloudEnv.MATTEL, []],
  [CloudEnv.REDVENTURES, []],
  [CloudEnv.SANLAM, []],
]);

const { KL_RETRIEVER_SERVICE_HOST: host, KL_RETRIEVER_SERVICE_PORT: port } = Config;
const scheme = process.env.NODE_ENV === 'e2e' ? 'https' : 'http';
const baseApiUrl = host && port ? `${scheme}://${host}:${port}` : null;
export const RETRIEVE_ENDPOINT = baseApiUrl ? new URL(`${baseApiUrl}/retrieve`).href : null;
export const FAQ_RETRIEVAL_ENDPOINT = baseApiUrl ? new URL(`${baseApiUrl}/api/v1/retrieve/faq`).href : null;
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
  faqSets?: Record<string, BaseModels.Project.KnowledgeBaseSetFaq>,
  settings?: BaseModels.Project.KnowledgeBaseSettings
): Promise<KnowledgeFaqRetrieve | null> => {
  if (FAQ_RETRIEVAL_ENDPOINT) {
    const { data } = await axios.post<KnowledgeBaseFaqResponse>(FAQ_RETRIEVAL_ENDPOINT, {
      projectID,
      workspaceID,
      question,
      settings,
    });

    const faq = data?.faq;

    if (faq?.answer) {
      let faqSetData: KnowledgeBaseFaqSet = {};

      if (faq?.faqSetID) {
        const faqSet: BaseModels.Project.KnowledgeBaseSetFaq | undefined = faqSets?.[faq?.faqSetID];
        faqSetData = { faqSetID: faqSet?.faqSetID, name: faqSet?.name };
      }

      return { answer: faq.answer, question: faq.question, faqSet: faqSetData };
    }
  }

  return null;
};

export const getKBSettings = (
  unleashClient: UnleashClient,
  teamID?: string,
  versionSettings?: BaseModels.Project.KnowledgeBaseSettings,
  projectSettings?: BaseModels.Project.KnowledgeBaseSettings
): BaseModels.Project.KnowledgeBaseSettings | undefined => {
  const useVersionedSettings = unleashClient.client.isEnabled(FeatureFlag.VERSIONED_KB_SETTINGS, {
    workspaceID: Number(teamID),
  });
  return (useVersionedSettings && versionSettings) || projectSettings;
};

export const addFaqTrace = (runtime: Runtime, faqQuestion: string, faqAnswer: string, query: string) => {
  runtime.trace.addTrace<BaseTrace.KnowledgeBase>({
    type: BaseNode.Utils.TraceType.KNOWLEDGE_BASE,
    payload: {
      contextType: KnowledgeBaseCtxType.FAQ,
      faqQuestion,
      faqAnswer,
      query,
      message: faqAnswer,
    },
  });
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

export const knowledgeBaseNoMatch = async (runtime: Runtime): Promise<AIResponse | null> => {
  if (!RETRIEVE_ENDPOINT || !KNOWLEDGE_BASE_LAMBDA_ENDPOINT) {
    log.error('[knowledgeBase] one of RETRIEVE_ENDPOINT or KNOWLEDGE_BASE_LAMBDA_ENDPOINT is null');
    return null;
  }

  if (!runtime.project?._id) return null;

  const input = AIAssist.getInput(runtime.getRequest());
  if (!input) return null;

  try {
    const kbSettings = getKBSettings(
      runtime?.services.unleash,
      runtime.project?.teamID,
      runtime?.version?.knowledgeBase?.settings,
      runtime?.project?.knowledgeBase?.settings
    );
    const question = input;

    // before checking KB, check if it is an FAQ
    const faq = await fetchFaq(
      runtime.project._id,
      runtime.project.teamID,
      question,
      runtime.project?.knowledgeBase?.faqSets,
      kbSettings
    );
    if (faq?.answer) {
      addFaqTrace(runtime, faq.question || '', faq.answer, question);
      return {
        model: 'faq',
        multiplier: 1,
        output: faq.answer,
        tokens: 0,
        queryTokens: 0,
        answerTokens: 0,
      };
    }

    const data = await fetchKnowledgeBase(runtime.project._id, runtime.project.teamID, question, kbSettings);
    if (!data) return null;

    const answer = await runtime.services.aiSynthesis.answerSynthesis({
      question,
      data,
      options: kbSettings?.summarization,
      variables: runtime.variables.getState(),
      context: { projectID: runtime.project._id, workspaceID: runtime.project.teamID },
    });

    const chunks = data?.chunks?.map((chunk) => JSON.stringify(chunk)) ?? [];
    const workspaceID = Number(runtime.project?.teamID);

    if (runtime.services.unleash.client.isEnabled(FeatureFlag.VF_CHUNKS_VARIABLE, { workspaceID })) {
      runtime.variables.set(VoiceflowConstants.BuiltInVariable.VF_CHUNKS, chunks);
    }

    if (!answer) return null;

    const { queryTokens } = answer;
    const { answerTokens } = answer;
    const tokens = queryTokens + answerTokens;

    // KB NOT_FOUND still uses tokens
    if (!answer.output) return { ...answer, tokens, queryTokens, answerTokens };

    // only add KB trace if result is success
    const documents = await runtime.api.getKBDocuments(
      runtime.version!.projectID,
      data.chunks.map(({ documentID }) => documentID)
    );

    runtime.trace.addTrace({
      type: 'knowledgeBase',
      payload: {
        chunks: data.chunks.map(({ score, documentID }) => ({
          score,
          documentID,
          documentData: documents[documentID]?.data,
        })),
        query: {
          messages: answer.messages,
          output: answer.output,
        },
      },
    } as any);

    return {
      ...answer,
      tokens,
      queryTokens,
      answerTokens,
    };
  } catch (err) {
    log.error(`[knowledge-base no match] ${log.vars({ err })}`);
    return null;
  }
};
