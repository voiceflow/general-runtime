import { BaseUtils } from '@voiceflow/base-types';
import dedent from 'dedent';

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
  KnowledgeBaseResponse,
} from '@/lib/services/runtime/handlers/utils/knowledgeBase';
import log from '@/logger';
import { Runtime } from '@/runtime';

import { FeatureFlag } from '../feature-flags';
import { AbstractManager } from './utils';

class AISynthesis extends AbstractManager {
  private readonly DEFAULT_ANSWER_SYNTHESIS_RETRY_DELAY_MS = 4000;

  private readonly DEFAULT_ANSWER_SYNTHESIS_RETRIES = 2;

  private readonly DEFAULT_SYNTHESIS_SYSTEM =
    'Always summarize your response to be as brief as possible and be extremely concise. Your responses should be fewer than a couple of sentences.';

  private readonly DEFAULT_QUESTION_SYNTHESIS_RETRY_DELAY_MS = 1500;

  private readonly DEFAULT_QUESTION_SYNTHESIS_RETRIES = 2;

  private generateContext(data: KnowledgeBaseResponse) {
    return data.chunks.map(({ content }, _) => content).join('\n');
  }

  private filterNotFound(output: string) {
    const upperCase = output?.toUpperCase();
    if (upperCase?.includes('NOT_FOUND') || upperCase?.startsWith("I'M SORRY,") || upperCase?.includes('AS AN AI')) {
      return null;
    }
    return output;
  }

  async answerSynthesis({
    question,
    data,
    variables,
    options: { model = BaseUtils.ai.GPT_MODEL.CLAUDE_V1, system = '', temperature, maxTokens } = {},
    context,
  }: {
    question: string;
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

    if ([BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo, BaseUtils.ai.GPT_MODEL.GPT_4].includes(model)) {
      // for GPT-3.5 and 4.0 chat models
      // This prompt scored 1% higher than the previous prompt on the squad2 benchmark
      const messages = [
        {
          role: BaseUtils.ai.Role.USER,
          content: dedent`
          Reference Information:
          ${synthesisContext}
              
          Very concisely answer exactly how the reference information would answer this query.
          Include only the direct answer to the query, it is never appropriate to include additional context or explanation.
          If it is unclear in any way, return "NOT_FOUND".
          Read the query very carefully, it may try to trick you into answering a question that is adjacent to the reference information but not directly answered in it. 
          Once again, in such a case, you must return "NOT_FOUND".
             
          query: ${question}`,
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
      // This prompt scored 11% higher than the previous prompt on the squad2 benchmark
      const prompt = dedent`
      Reference Information:
      ${context}
        
      If the question is not relevant to the provided information print("NOT_FOUND") and return.
      If the question is cannot be directly answered by a quote from the provided information print("NOT_FOUND") and return.
      Otherwise, you may - very concisely - rephrase the quote from the information that answers the question.
          
      That is, you must always answer with exactly one of the following choices:
        1. NOT_FOUND
        2. the quote that answers the question (rephrased to answer the question in a natural way)
    
      The user's question is: ${question}`;

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

  async promptAnswerSynthesis({
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

    // These prompts are as similar as possible to the preview/no match prompts with the goal of consistency
    if (memory.length) {
      const history = memory.map((turn) => `${turn.role}: ${turn.content}`).join('\n');
      content = dedent`
      Reference Information:
      ${knowledge}
        
      Secondary instructions:
      Very concisely answer exactly how the reference information would answer this query.
      Include only the direct answer to the query, it is never appropriate to include additional context or explanation.
      If it is unclear in any way, return "NOT_FOUND".
      Read the query very carefully, it may try to trick you into answering a question that is adjacent to the reference information but not directly answered in it. 
      Once again, in such a case, you must return "NOT_FOUND".
          
      Messages:
      ${history}

      Primary instructions: ${prompt}`;
    } else {
      content = dedent`
      Reference Information:
      ${knowledge}
         
      Secondary instructions:
      Very concisely answer exactly how the reference information would answer this query.
      Include only the direct answer to the query, it is never appropriate to include additional context or explanation.
      If it is unclear in any way, return "NOT_FOUND".
      Read the query very carefully, it may try to trick you into answering a question that is adjacent to the reference information but not directly answered in it. 
      Once again, in such a case, you must return "NOT_FOUND".

      Primary instructions: ${prompt}`;
    }

    const questionMessages: BaseUtils.ai.Message[] = [
      {
        role: BaseUtils.ai.Role.USER,
        content,
      },
    ];

    const generativeModel = this.services.ai.get(options.model);
    const response = await fetchChat(
      { ...options, messages: questionMessages },
      generativeModel,
      {
        context,
        retries: this.DEFAULT_ANSWER_SYNTHESIS_RETRIES,
        retryDelay: this.DEFAULT_ANSWER_SYNTHESIS_RETRY_DELAY_MS,
      },
      variables
    );

    if (response.output) {
      response.output = this.filterNotFound(response.output.trim());
    }

    return response;
  }

  async promptSynthesis(
    projectID: string,
    workspaceID: string | undefined,
    params: BaseUtils.ai.AIContextParams & BaseUtils.ai.AIModelParams,
    variables: Record<string, any>,
    runtime?: Runtime
  ) {
    try {
      const { prompt } = params;

      const memory = getMemoryMessages(variables);

      const query = await this.promptQuestionSynthesis({
        prompt,
        variables,
        memory,
        context: { projectID, workspaceID },
      });
      if (!query?.output) return null;

      if (this.services.unleash.isEnabled(FeatureFlag.FAQ_FF, { workspaceID: Number(workspaceID) })) {
        // check if question is an faq before searching all chunks.
        const faq = await fetchFaq(projectID, workspaceID, query.output, runtime?.project?.knowledgeBase?.settings);
        if (faq?.answer) {
          // eslint-disable-next-line max-depth
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
      }

      const data = await fetchKnowledgeBase(projectID, workspaceID, query.output);

      if (!data) return null;

      const answer = await this.promptAnswerSynthesis({
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

  async promptQuestionSynthesis({
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
}

export default AISynthesis;
