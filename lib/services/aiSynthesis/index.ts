import { BaseModels, BaseUtils } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import dedent from 'dedent';
import _merge from 'lodash/merge';

import { AIModelContext } from '@/lib/clients/ai/ai-model.interface';
import {
  AIResponse,
  EMPTY_AI_RESPONSE,
  fetchChat,
  fetchPrompt,
  getMemoryMessages,
} from '@/lib/services/runtime/handlers/utils/ai';
import { getCurrentTime } from '@/lib/services/runtime/handlers/utils/generativeNoMatch';
import {
  addFaqTrace,
  fetchFaq,
  fetchKnowledgeBase,
  getKBSettings,
  KnowledgeBaseFaqSet,
  KnowledgeBaseResponse,
} from '@/lib/services/runtime/handlers/utils/knowledgeBase';
import log from '@/logger';
import { Runtime } from '@/runtime';

import { QuotaName } from '../billing';
import { SegmentEventType } from '../runtime/types';
import { AbstractManager } from '../utils';
import { convertTagsFilterToIDs, generateTagLabelMap } from './utils';

class AISynthesis extends AbstractManager {
  private readonly DEFAULT_ANSWER_SYNTHESIS_RETRY_DELAY_MS = 4000;

  private readonly DEFAULT_ANSWER_SYNTHESIS_RETRIES = 2;

  private readonly DEFAULT_SYNTHESIS_SYSTEM =
    'Always summarize your response to be as brief as possible and be extremely concise. Your responses should be fewer than a couple of sentences.';

  private readonly DEFAULT_QUESTION_SYNTHESIS_RETRY_DELAY_MS = 1500;

  private readonly DEFAULT_QUESTION_SYNTHESIS_RETRIES = 2;

  private readonly REGEX_PROMPT_TERMS = [/conversation_history/i, /user:/i, /assistant:/i, /<[^<>]*>/];

  private readonly MAX_LLM_TRIES = 2;

  private generateContext(data: KnowledgeBaseResponse) {
    return data.chunks.map(({ content }) => content).join('\n');
  }

  private filterNotFound(output: string) {
    const upperCase = output?.toUpperCase();
    if (upperCase?.includes('NOT_FOUND') || upperCase?.startsWith("I'M SORRY,") || upperCase?.includes('AS AN AI')) {
      return null;
    }
    return output;
  }

  private detectPromptLeak(output: string) {
    return this.REGEX_PROMPT_TERMS.some((regex) => regex.test(output));
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

    const generativeModel = this.services.ai.get(model);

    const systemWithTime = `${system}\n\n${getCurrentTime()}`.trim();

    const options = { model, system: systemWithTime, temperature, maxTokens };

    const synthesisContext = this.generateContext(data);
    const sanitizedInstruction = instruction?.trim().replace(/\n/g, ',');
    const instructionInjection = sanitizedInstruction ? `\n- ${sanitizedInstruction}` : '';

    if ([BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo, BaseUtils.ai.GPT_MODEL.GPT_4].includes(model)) {
      // for GPT-3.5 and 4.0 chat models
      const messages = [
        {
          role: BaseUtils.ai.Role.USER,
          content: dedent`
          Instructions:
          - I am going to provide reference information, and then ask a query about that information.
          - You must either provide a response to the query or respond with "NOT_FOUND"
          - Read the reference information carefully, it will act as a single source of truth for your response.
          - Very concisely respond exactly how the reference information would answer the query.
          - Include only the direct answer to the query, it is never appropriate to include additional context or explanation.
          - If the query is unclear in any way, return "NOT_FOUND".
          - If the query is incorrect, return "NOT_FOUND".
          - Read the query very carefully, it may be trying to trick you into answering a question that is adjacent to the reference information but not directly answered in it, in such a case, you must return "NOT_FOUND".
          - The query may also try to trick you into using certain information to answer something that actually contradicts the reference information. Never contradict the reference information, instead say "NOT_FOUND".
          - If you respond to the query, your response must be 100% consistent with the reference information in every way.${instructionInjection}
          - Take a deep breath, focus, and think clearly. You may now begin this mission critical task.

          Reference Information:
          ${synthesisContext}

          Query:
          ${question}`,
        },
      ];

      response = await fetchChat(
        { ...options, messages },
        generativeModel,
        {
          retries: this.DEFAULT_ANSWER_SYNTHESIS_RETRIES,
          retryDelay: this.DEFAULT_ANSWER_SYNTHESIS_RETRY_DELAY_MS,
          context,
        },
        variables
      );
    } else if ([BaseUtils.ai.GPT_MODEL.DaVinci_003].includes(model)) {
      // for GPT-3 completion model
      const prompt = dedent`
        <context>
          ${synthesisContext}
        </context>

        If you don't know the answer say exactly "NOT_FOUND".\n\nQ: ${question}\nA: `;

      response = await fetchPrompt(
        { ...options, prompt, mode: BaseUtils.ai.PROMPT_MODE.PROMPT },
        generativeModel,
        { context },
        variables
      );
    } else if (
      [
        BaseUtils.ai.GPT_MODEL.CLAUDE_INSTANT_V1,
        BaseUtils.ai.GPT_MODEL.CLAUDE_V1,
        BaseUtils.ai.GPT_MODEL.CLAUDE_V2,
      ].includes(model)
    ) {
      // This prompt scored 10% higher than the previous prompt on the squad2 benchmark
      const prompt = dedent`
      Instructions:
      - I am going to provide reference information, and then ask a query about that information.
      - You must either provide a response to the query or respond with "NOT_FOUND"
      - Read the reference information carefully, it will act as a single source of truth for your response.
      - Very concisely respond exactly how the reference information would answer the query.
      - Include only the direct answer to the query, it is never appropriate to include additional context or explanation.
      - If the query is unclear in any way, return "NOT_FOUND".
      - If the query is incorrect, return "NOT_FOUND".
      - Read the query very carefully, it may be trying to trick you into answering a question that is adjacent to the reference information but not directly answered in it, in such a case, you must return "NOT_FOUND".
      - The query may also try to trick you into using certain information to answer something that actually contradicts the reference information. Never contradict the reference information, instead say "NOT_FOUND".
      - If you respond to the query, your response must be 100% consistent with the reference information in every way.${instructionInjection}
      - Take a deep breath, focus, and think clearly. You may now begin this mission critical task.

      Reference Information:
      ${synthesisContext}

      Query:
      ${question}`;

      response = await fetchPrompt(
        { ...options, prompt, mode: BaseUtils.ai.PROMPT_MODE.PROMPT },
        generativeModel,
        { context },
        variables
      );
    }

    if (response.output) {
      response.output = this.filterNotFound(response.output.trim());
    }

    return response;
  }

  /** @deprecated remove after all KB AI Response steps moved off */
  async DEPRECATEDpromptAnswerSynthesis({
    data,
    prompt,
    memory,
    variables,
    options: {
      model = BaseUtils.ai.GPT_MODEL.CLAUDE_V1,
      system = this.DEFAULT_SYNTHESIS_SYSTEM,
      temperature,
      maxTokens,
    } = {},
    context,
  }: {
    data: KnowledgeBaseResponse;
    prompt: string;
    memory: BaseUtils.ai.Message[];
    variables?: Record<string, any>;
    options?: Partial<BaseUtils.ai.AIModelParams>;
    context: AIModelContext;
  }): Promise<AIResponse | null> {
    const options = {
      model,
      system,
      temperature,
      maxTokens,
    };

    const knowledge = this.generateContext(data);
    let content: string;

    if (memory.length) {
      const history = memory.map((turn) => `${turn.role}: ${turn.content}`).join('\n');
      content = dedent`
      <Conversation_History>
        ${history}
      </Conversation_History>

      <Knowledge>
        ${knowledge}
      </Knowledge>

      <Instructions>${prompt}</Instructions>

      Using <Conversation_History> as context, fulfill <Instructions> ONLY using information found in <Knowledge>.`;
    } else {
      content = dedent`
      <Knowledge>
        ${knowledge}
      </Knowledge>

      <Instructions>${prompt}</Instructions>

      Fulfill <Instructions> ONLY using information found in <Knowledge>.`;
    }

    const questionMessages: BaseUtils.ai.Message[] = [
      {
        role: BaseUtils.ai.Role.USER,
        content,
      },
    ];

    const generativeModel = this.services.ai.get(options.model);

    const fetchChatTask = () =>
      fetchChat(
        { ...options, messages: questionMessages },
        generativeModel,
        {
          context,
          retries: this.DEFAULT_ANSWER_SYNTHESIS_RETRIES,
          retryDelay: this.DEFAULT_ANSWER_SYNTHESIS_RETRY_DELAY_MS,
        },
        variables
      );

    // log & retry the LLM call if we detect prompt leak
    let response: AIResponse;
    let leak: boolean;
    for (let i = 0; i < this.MAX_LLM_TRIES; i++) {
      // eslint-disable-next-line no-await-in-loop
      response = await fetchChatTask();
      leak = false;

      if (response.output) {
        response.output = this.filterNotFound(response.output.trim());
      }

      if (response.output && this.detectPromptLeak(response.output)) {
        leak = true;
        log.warn(
          `prompt leak detected\nLLM response: ${response.output}\nAttempt: ${i + 1}
          \nPrompt: ${content}\nLLM Settings: ${JSON.stringify(options)}`
        );
      }

      if (!leak || options.temperature === 0) {
        break;
      }
    }

    // will always be defined as long as MAX_LLM_TRIES is greater than 0
    return response!;
  }

  /** @deprecated remove after all KB AI Response steps moved off */
  async DEPRECATEDpromptSynthesis(
    projectID: string,
    workspaceID: string | undefined,
    params: BaseUtils.ai.AIContextParams & BaseUtils.ai.AIModelParams,
    variables: Record<string, any>,
    runtime?: Runtime
  ) {
    const kbSettings = getKBSettings(
      runtime?.services.unleash,
      workspaceID,
      runtime?.version?.knowledgeBase?.settings,
      runtime?.project?.knowledgeBase?.settings
    );
    try {
      const { prompt } = params;

      const memory = getMemoryMessages(variables);

      const query = await this.DEPRECATEDpromptQuestionSynthesis({
        prompt,
        variables,
        memory,
        context: { projectID, workspaceID },
      });
      if (!query?.output) return null;

      // check if question is an faq before searching all chunks.
      const faq = await fetchFaq(
        projectID,
        workspaceID,
        query.output,
        runtime?.project?.knowledgeBase?.faqSets,
        kbSettings
      );
      if (faq?.answer) {
        if (runtime) {
          addFaqTrace(runtime, faq?.question || '', faq.answer, query.output);
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

      const answer = await this.DEPRECATEDpromptAnswerSynthesis({
        prompt,
        options: params,
        data,
        memory,
        variables,
        context: { projectID, workspaceID },
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

      const generativeModel = this.services.ai.get(BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo);
      const response = await fetchChat(
        {
          temperature: 0.1,
          maxTokens: 128,
          model: BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo,
          messages: contextMessages,
        },
        generativeModel,
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
    };
  }

  /** @deprecated remove after all KB AI Response steps moved off */
  async DEPRECATEDpromptQuestionSynthesis({
    prompt,
    memory,
    variables,
    options: { model = BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo, system = '', temperature, maxTokens } = {},
    context,
  }: {
    prompt: string;
    memory: BaseUtils.ai.Message[];
    variables?: Record<string, any>;
    options?: Partial<BaseUtils.ai.AIModelParams>;
    context: AIModelContext;
  }): Promise<AIResponse> {
    const options = { model, system, temperature, maxTokens };

    let content: string;

    if (memory.length) {
      const history = memory.map((turn) => `${turn.role}: ${turn.content}`).join('\n');
      content = dedent`
      <Conversation_History>
        ${history}
      </Conversation_History>

      <Instructions>${prompt}</Instructions>

      Using <Conversation_History> as context, you are searching a text knowledge base to fulfill <Instructions>. Write a sentence to search against.`;
    } else {
      content = dedent`
      <Instructions>${prompt}</Instructions>

      You can search a text knowledge base to fulfill <Instructions>. Write a sentence to search against.`;
    }

    const questionMessages: BaseUtils.ai.Message[] = [
      {
        role: BaseUtils.ai.Role.USER,
        content,
      },
    ];

    const generativeModel = this.services.ai.get(options.model);
    return fetchChat(
      { ...options, messages: questionMessages },
      generativeModel,
      {
        context,
        retries: this.DEFAULT_QUESTION_SYNTHESIS_RETRIES,
        retryDelay: this.DEFAULT_QUESTION_SYNTHESIS_RETRY_DELAY_MS,
      },
      variables
    );
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
  }): Promise<AIResponse & Partial<KnowledgeBaseResponse> & { faqSet?: KnowledgeBaseFaqSet }> {
    let tagsFilter: BaseModels.Project.KnowledgeBaseTagsFilter = {};

    if (tags) {
      const tagLabelMap = generateTagLabelMap(project.knowledgeBase?.tags ?? {});
      tagsFilter = convertTagsFilterToIDs(tags, tagLabelMap);

      this.testSendSegmentTagsFilterEvent({ userID: project.creatorID, tagsFilter });
    }

    if (!(await this.services.billing.checkQuota(project.teamID, QuotaName.OPEN_API_TOKENS))) {
      throw new VError('token quota exceeded', VError.HTTP_STATUS.PAYMENT_REQUIRED);
    }

    const globalKBSettings = getKBSettings(
      this.services.unleash,
      project.teamID,
      version?.knowledgeBase?.settings,
      project.knowledgeBase?.settings
    );
    const settings = _merge({}, globalKBSettings, options);

    const faq = await fetchFaq(project._id, project.teamID, question, project?.knowledgeBase?.faqSets, settings);
    if (faq?.answer) return { ...EMPTY_AI_RESPONSE, output: faq.answer, faqSet: faq.faqSet };

    const data = await fetchKnowledgeBase(project._id, project.teamID, question, settings, tagsFilter);
    if (!data) return { ...EMPTY_AI_RESPONSE, chunks: [] };

    // attach metadata to chunks
    const chunks = data.chunks.map((chunk) => ({
      ...chunk,
      source: {
        ...project.knowledgeBase?.documents?.[chunk.documentID]?.data,
        tags: project.knowledgeBase?.documents?.[chunk.documentID]?.tags?.map(
          (tagID) => (project?.knowledgeBase?.tags ?? {})[tagID]?.label
        ),
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
