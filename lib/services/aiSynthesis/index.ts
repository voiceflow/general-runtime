/* eslint-disable sonarjs/cognitive-complexity */
import { BaseModels, BaseUtils } from '@voiceflow/base-types';
import _merge from 'lodash/merge';
import { concatMap, filter, from, lastValueFrom, map, Observable, of, reduce } from 'rxjs';

import { AIModelContext } from '@/lib/clients/ai/ai-model.interface';
import { AIResponse, EMPTY_AI_RESPONSE, fetchChat, fetchChatStream } from '@/lib/services/runtime/handlers/utils/ai';
import { getCurrentTime } from '@/lib/services/runtime/handlers/utils/generativeNoMatch';
import {
  fetchFaq,
  fetchKnowledgeBase,
  getKBSettings,
  KnowledgeBaseResponse,
} from '@/lib/services/runtime/handlers/utils/knowledgeBase';

import { SegmentEventType } from '../runtime/types';
import { AbstractManager } from '../utils';
import { BufferedReducerSubject } from './buffer-reduce.subject';
import { KBResponse } from './types';
import {
  convertTagsFilterToIDs,
  generateAnswerSynthesisPrompt,
  generateTagLabelMap,
  NOT_FOUND_RESPONSES,
  removePromptLeak,
} from './utils';

class AISynthesis extends AbstractManager {
  private readonly DEFAULT_ANSWER_SYNTHESIS_RETRY_DELAY_MS = 4000;

  private readonly DEFAULT_ANSWER_SYNTHESIS_RETRIES = 2;

  private readonly DEFAULT_QUESTION_SYNTHESIS_RETRY_DELAY_MS = 1500;

  private readonly DEFAULT_QUESTION_SYNTHESIS_RETRIES = 2;

  private filterNotFound(output: string) {
    const upperCase = output.toUpperCase();
    if (NOT_FOUND_RESPONSES.some((phrase) => upperCase.includes(phrase))) {
      return null;
    }

    return output;
  }

  answerSynthesisStream({
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
  }): Observable<AIResponse> {
    const systemWithTime = `${system}\n\n${getCurrentTime()}`.trim();

    const options = { model, system: systemWithTime, temperature, maxTokens };

    const messages = [
      {
        role: BaseUtils.ai.Role.USER,
        content: generateAnswerSynthesisPrompt({ query: question, instruction, data }),
      },
    ];

    return from(
      fetchChatStream(
        { ...options, messages },
        this.services.mlGateway,
        {
          retries: this.DEFAULT_ANSWER_SYNTHESIS_RETRIES,
          retryDelay: this.DEFAULT_ANSWER_SYNTHESIS_RETRY_DELAY_MS,
          context,
        },
        variables
      )
    ).pipe(filter((completion) => !!completion?.output));
  }

  async answerSynthesis(params: {
    question: string;
    instruction?: string;
    data: KnowledgeBaseResponse;
    variables?: Record<string, any>;
    options?: Partial<BaseUtils.ai.AIModelParams>;
    context: AIModelContext;
  }): Promise<AIResponse | null> {
    const response: AIResponse = await lastValueFrom(
      from(this.answerSynthesisStream(params)).pipe(
        reduce(
          (acc, completion) => {
            if (!completion) return acc;
            if (!acc.output) acc.output = '';

            acc.output += completion.output ?? '';
            acc.answerTokens += completion.answerTokens;
            acc.queryTokens += completion.queryTokens;
            acc.tokens += completion.tokens;
            acc.model = completion.model;
            acc.multiplier = completion.multiplier;
            return acc;
          },
          { ...EMPTY_AI_RESPONSE }
        )
      )
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

  async knowledgeBaseQueryStream({
    project,
    version,
    question,
    instruction,
    synthesis = true,
    options,
    tags,
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
  }): Promise<Observable<KBResponse>> {
    let tagsFilter: BaseModels.Project.KnowledgeBaseTagsFilter = {};

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
    if (faq?.answer) return of({ ...EMPTY_AI_RESPONSE, output: faq.answer, faqSet: faq.faqSet });

    const data = await fetchKnowledgeBase(project._id, project.teamID, question, settingsWithoutModel, tagsFilter);
    if (!data) return of({ ...EMPTY_AI_RESPONSE, chunks: [] });

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

    if (!synthesis) return of({ ...EMPTY_AI_RESPONSE, chunks });

    const stream$ = new BufferedReducerSubject<KBResponse>(
      (resp) => {
        const output = (resp.output ?? '').toLocaleUpperCase();
        // Stop stream all together if output is a bad phrase
        if (this.filterNotFound(resp.output ?? '') === null) return 'stop';

        // Keep buffering if the output appears to match a bad phrase
        return NOT_FOUND_RESPONSES.some((phrase) => phrase.startsWith(output));
      },
      (buffer, value) => {
        if (!buffer.output) buffer.output = '';
        if (!buffer.chunks) buffer.chunks = [];

        buffer.chunks.push(...(value.chunks ?? []));
        buffer.output += value.output ?? '';
        buffer.answerTokens += value.answerTokens;
        buffer.queryTokens += value.queryTokens;
        buffer.tokens += value.tokens;
        buffer.model = value.model;
        buffer.multiplier = value.multiplier;
        buffer.faqSet = value.faqSet;
        return buffer;
      }
    );

    from(
      this.services.aiSynthesis.answerSynthesisStream({
        question,
        instruction,
        data,
        options: settings?.summarization,
        context: { projectID: project._id, workspaceID: project.teamID },
      })
    )
      .pipe(map((answer, i) => (i === 0 ? { chunks, ...answer } : answer)))
      .subscribe(stream$);

    return stream$;
  }

  async knowledgeBaseQuery(params: {
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
  }): Promise<KBResponse> {
    const response = await lastValueFrom(
      from(this.knowledgeBaseQueryStream(params)).pipe(
        concatMap((stream) => stream),
        reduce<KBResponse, KBResponse>(
          (acc, completion) => {
            if (!acc.output) acc.output = '';
            if (!acc.chunks) acc.chunks = [];

            acc.chunks.push(...(completion.chunks ?? []));
            acc.output += completion.output ?? '';
            acc.answerTokens += completion.answerTokens;
            acc.queryTokens += completion.queryTokens;
            acc.tokens += completion.tokens;
            acc.model = completion.model;
            acc.multiplier = completion.multiplier;
            acc.faqSet = completion.faqSet;
            return acc;
          },
          { ...EMPTY_AI_RESPONSE }
        )
      )
    );

    response.output = response.output?.trim() || null;
    if (response.output) {
      response.output = this.filterNotFound(response.output);
      response.output = removePromptLeak(response.output);
    }

    return response;
  }
}

export default AISynthesis;
