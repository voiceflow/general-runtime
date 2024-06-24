/* eslint-disable ,no-restricted-syntax,no-prototype-builtins */
import { BaseModels, BaseUtils } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import _merge from 'lodash/merge';

import { AIModelContext } from '@/lib/clients/ai/ai-model.interface';
import { AIResponse, EMPTY_AI_RESPONSE, fetchChat } from '@/lib/services/runtime/handlers/utils/ai';
import { getCurrentTime } from '@/lib/services/runtime/handlers/utils/generativeNoMatch';
import {
  fetchFaq,
  fetchKnowledgeBase,
  getKBSettings,
  KnowledgeBaseFaqSet,
  KnowledgeBaseResponse,
} from '@/lib/services/runtime/handlers/utils/knowledgeBase';

import { SegmentEventType } from '../runtime/types';
import { AbstractManager } from '../utils';
import { convertTagsFilterToIDs, generateAnswerSynthesisPrompt, generateTagLabelMap, removePromptLeak } from './utils';

class AISynthesis extends AbstractManager {
  private readonly DEFAULT_ANSWER_SYNTHESIS_RETRY_DELAY_MS = 4000;

  private readonly DEFAULT_ANSWER_SYNTHESIS_RETRIES = 2;

  private readonly DEFAULT_QUESTION_SYNTHESIS_RETRY_DELAY_MS = 1500;

  private readonly DEFAULT_QUESTION_SYNTHESIS_RETRIES = 2;

  private readonly VALID_OPERATORS: Set<string> = new Set([
    '$eq',
    '$ne',
    '$gt',
    '$gte',
    '$lt',
    '$lte',
    '$in',
    '$nin',
    '$and',
    '$or',
    '$not',
    '$all',
  ]);

  private filterNotFound(output: string) {
    const upperCase = output?.toUpperCase();
    if (upperCase?.includes('NOT_FOUND') || upperCase?.startsWith("I'M SORRY,") || upperCase?.includes('AS AN AI')) {
      return null;
    }
    return output;
  }

  private validateMetadataFilters(filters?: Record<string, any>) {
    if (!filters) return;

    for (const [key, value] of Object.entries(filters)) {
      this.validateKeyAndValue(key, value);
    }
  }

  private validateKeyAndValue(key: string, value: any) {
    if (key.startsWith('$')) {
      this.validateOperatorKey(key, value);
    } else if (typeof value === 'object' && value !== null) {
      this.validateObjectValue(value);
    }
  }

  private validateOperatorKey(key: string, value: any) {
    if (!this.VALID_OPERATORS.has(key)) {
      this.throwInvalidFilterError();
    }
    this.validateNestedValues(value);
  }

  private validateObjectValue(value: any) {
    for (const nestedKey in value) {
      if (value.hasOwnProperty(nestedKey)) {
        this.validateNestedKey(nestedKey);
      }
    }
    this.validateNestedValues(value);
  }

  private validateNestedKey(nestedKey: string) {
    if (!nestedKey.startsWith('$')) {
      this.throwInvalidOperatorError(nestedKey);
    }
    if (!this.VALID_OPERATORS.has(nestedKey)) {
      this.throwInvalidFilterError();
    }
  }

  private validateNestedValues(value: any) {
    if (Array.isArray(value)) {
      for (const subValue of value) {
        if (typeof subValue === 'object' && subValue !== null) {
          this.validateMetadataFilters(subValue);
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      this.validateMetadataFilters(value);
    }
  }

  private throwInvalidFilterError() {
    throw new VError(
      'The filter criteria provided are invalid. Please check the filter syntax and values.',
      VError.HTTP_STATUS.UNPROCESSABLE_ENTITY
    );
  }

  private throwInvalidOperatorError(operator: string) {
    throw new VError(
      `Invalid operator "${operator}". Operators must start with a $.`,
      VError.HTTP_STATUS.UNPROCESSABLE_ENTITY
    );
  }

  async answerSynthesis({
    question,
    instruction,
    data,
    variables,
    options: { model = BaseUtils.ai.GPT_MODEL.CLAUDE_V1, system = '', temperature, maxTokens } = {},
    context,
  }: {
    question: string;
    instruction?: string;
    data: KnowledgeBaseResponse;
    variables?: Record<string, any>;
    options?: Partial<BaseUtils.ai.AIModelParams>;
    context: AIModelContext;
  }): Promise<AIResponse | null> {
    let response: AIResponse = EMPTY_AI_RESPONSE;

    const systemWithTime = `${system}\n\n${getCurrentTime()}`.trim();

    const options = { model, system: systemWithTime, temperature, maxTokens };

    const messages = [
      {
        role: BaseUtils.ai.Role.USER,
        content: generateAnswerSynthesisPrompt({ query: question, instruction, data }),
      },
    ];

    response = await fetchChat(
      { ...options, messages },
      this.services.mlGateway,
      {
        retries: this.DEFAULT_ANSWER_SYNTHESIS_RETRIES,
        retryDelay: this.DEFAULT_ANSWER_SYNTHESIS_RETRY_DELAY_MS,
        context,
      },
      variables
    );

    response.output = response.output?.trim() || null;
    if (response.output) {
      response.output = this.filterNotFound(response.output);
      response.output = removePromptLeak(response.output);
    }

    return response;
  }

  async questionSynthesis(
    question: string,
    memory: BaseUtils.ai.Message[],
    context: AIModelContext
  ): Promise<AIResponse> {
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

      const response = await fetchChat(
        {
          temperature: 0.1,
          maxTokens: 128,
          model: BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo,
          messages: contextMessages,
        },
        this.services.mlGateway,
        {
          context,
          retries: this.DEFAULT_QUESTION_SYNTHESIS_RETRIES,
          retryDelay: this.DEFAULT_QUESTION_SYNTHESIS_RETRY_DELAY_MS,
        }
      );

      if (response.output) return response;
    }

    return {
      ...EMPTY_AI_RESPONSE,
      output: question,
      model: BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo,
    };
  }

  testSendSegmentTagsFilterEvent = async ({
    userID,
    tagsFilter,
  }: {
    userID: number;
    tagsFilter: BaseModels.Project.KnowledgeBaseTagsFilter;
  }) => {
    const analyticsPlatformClient = await this.services.analyticsPlatform.getClient();
    const operators: string[] = [];

    if (tagsFilter?.includeAllTagged) operators.push('includeAllTagged');
    if (tagsFilter?.includeAllNonTagged) operators.push('includeAllNonTagged');
    if (tagsFilter?.include) operators.push('include');
    if (tagsFilter?.exclude) operators.push('exclude');

    const includeTagsArray = tagsFilter?.include?.items || [];
    const excludeTagsArray = tagsFilter?.exclude?.items || [];
    const tags = Array.from(new Set([...includeTagsArray, ...excludeTagsArray]));

    if (analyticsPlatformClient) {
      analyticsPlatformClient.track({
        identity: { userID },
        name: SegmentEventType.KB_TAGS_USED,
        properties: { operators, tags_searched: tags, number_of_tags: tags.length },
      });
    }
  };

  async knowledgeBaseQuery({
    project,
    version,
    question,
    instruction,
    synthesis = true,
    options,
    tags,
    filters,
  }: {
    project: BaseModels.Project.Model<any, any>;
    version?: BaseModels.Version.Model<any> | null;
    question: string;
    instruction?: string;
    synthesis?: boolean;
    options?: {
      search?: Partial<BaseModels.Project.KnowledgeBaseSettings['search']>;
      summarization?: Partial<BaseModels.Project.KnowledgeBaseSettings['summarization']>;
    };
    tags?: BaseModels.Project.KnowledgeBaseTagsFilter;
    filters?: Record<string, any>;
  }): Promise<AIResponse & Partial<KnowledgeBaseResponse> & { faqSet?: KnowledgeBaseFaqSet }> {
    let tagsFilter: BaseModels.Project.KnowledgeBaseTagsFilter = {};

    this.validateMetadataFilters(filters);

    if (tags) {
      const tagLabelMap = generateTagLabelMap(project.knowledgeBase?.tags ?? {});
      tagsFilter = convertTagsFilterToIDs(tags, tagLabelMap);

      this.testSendSegmentTagsFilterEvent({ userID: project.creatorID, tagsFilter });
    }

    const globalKBSettings = getKBSettings(
      this.services.unleash,
      project.teamID,
      version?.knowledgeBase?.settings,
      project.knowledgeBase?.settings
    );
    const settings = _merge({}, globalKBSettings, options);
    // ML team needs to not have a hard model check
    const settingsWithoutModel = { ...settings, summarization: { ...settings.summarization, model: undefined } };

    const faq = await fetchFaq(
      project._id,
      project.teamID,
      question,
      project?.knowledgeBase?.faqSets,
      settingsWithoutModel
    );
    if (faq?.answer) return { ...EMPTY_AI_RESPONSE, output: faq.answer, faqSet: faq.faqSet };

    const data = await fetchKnowledgeBase(
      project._id,
      project.teamID,
      question,
      settingsWithoutModel,
      tagsFilter,
      filters
    );
    if (!data) return { ...EMPTY_AI_RESPONSE, chunks: [] };

    // attach metadata to chunks
    const api = await this.services.dataAPI.get();
    const documents = await api.getKBDocuments(
      project._id,
      data.chunks.map((chunk) => chunk.documentID)
    );

    const chunks = data.chunks.map((chunk) => ({
      ...chunk,
      source: {
        ...documents?.[chunk.documentID]?.data,
        tags: documents?.[chunk.documentID]?.tags?.map((tagID) => (project?.knowledgeBase?.tags ?? {})[tagID]?.label),
      },
    }));

    if (!synthesis) return { ...EMPTY_AI_RESPONSE, chunks };

    const answer = await this.services.aiSynthesis.answerSynthesis({
      question,
      instruction,
      data,
      options: settings?.summarization,
      context: { projectID: project._id, workspaceID: project.teamID },
    });

    if (!answer) return { ...EMPTY_AI_RESPONSE, chunks };

    return {
      chunks,
      ...answer,
    };
  }
}

export default AISynthesis;
