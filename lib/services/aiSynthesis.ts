import { BaseUtils } from '@voiceflow/base-types';
import dedent from 'dedent';

import {
  AIResponse,
  EMPTY_AI_RESPONSE,
  fetchChat,
  fetchPrompt,
  getMemoryMessages,
} from '@/lib/services/runtime/handlers/utils/ai';
import { getCurrentTime } from '@/lib/services/runtime/handlers/utils/generativeNoMatch';
import { fetchKnowledgeBase, KnowledgeBaseResponse } from '@/lib/services/runtime/handlers/utils/knowledgeBase';
import log from '@/logger';
import { Runtime } from '@/runtime';

import { AbstractManager } from './utils';

class AISynthesis extends AbstractManager {
  private readonly DEFAULT_ANSWER_SYNTHESIS_RETRY_DELAY_MS = 4000;

  private readonly DEFAULT_ANSWER_SYNTHESIS_RETRIES = 2;

  private readonly DEFAULT_SYNTHESIS_SYSTEM =
    'Always summarize your response to be as brief as possible and be extremely concise. Your responses should be fewer than a couple of sentences.';

  private readonly DEFAULT_QUESTION_SYNTHESIS_RETRY_DELAY_MS = 1500;

  private readonly DEFAULT_QUESTION_SYNTHESIS_RETRIES = 2;

  private generateContext(data: KnowledgeBaseResponse) {
    return data.chunks.map(({ content }, index) => `<${index + 1}>${content}</${index + 1}>`).join('\n');
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
  }: {
    question: string;
    data: KnowledgeBaseResponse;
    variables?: Record<string, any>;
    options?: Partial<BaseUtils.ai.AIModelParams>;
  }): Promise<AIResponse | null> {
    let response: AIResponse = EMPTY_AI_RESPONSE;

    const generativeModel = this.services.ai.get(model);

    const systemWithTime = `${system}\n\n${getCurrentTime()}`.trim();

    const options = { model, system: systemWithTime, temperature, maxTokens };

    const context = this.generateContext(data);

    if ([BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo, BaseUtils.ai.GPT_MODEL.GPT_4].includes(model)) {
      // for GPT-3.5 and 4.0 chat models
      const messages = [
        {
          role: BaseUtils.ai.Role.SYSTEM,
          content: dedent`
            <context>
              ${context}
            </context>
          `,
        },
        {
          role: BaseUtils.ai.Role.USER,
          content: dedent`
            Answer the following question using ONLY the provided <context>, if you don't know the answer say exactly "NOT_FOUND".
  
            Question:
            ${question}
          `,
        },
      ];

      const generativeModel = this.services.ai.get(options.model);
      response = await fetchChat({ ...options, messages }, generativeModel, variables, {
        retries: this.DEFAULT_ANSWER_SYNTHESIS_RETRIES,
        retryDelay: this.DEFAULT_ANSWER_SYNTHESIS_RETRY_DELAY_MS,
      });
    } else if ([BaseUtils.ai.GPT_MODEL.DaVinci_003].includes(model)) {
      // for GPT-3 completion model
      const prompt = dedent`
        <context>
          ${context}
        </context>
  
        If you don't know the answer say exactly "NOT_FOUND".\n\nQ: ${question}\nA: `;

      response = await fetchPrompt(
        { ...options, prompt, mode: BaseUtils.ai.PROMPT_MODE.PROMPT },
        generativeModel,
        variables
      );
    } else if (
      [
        BaseUtils.ai.GPT_MODEL.CLAUDE_INSTANT_V1,
        BaseUtils.ai.GPT_MODEL.CLAUDE_V1,
        BaseUtils.ai.GPT_MODEL.CLAUDE_V2,
      ].includes(model)
    ) {
      const prompt = dedent`
        <information>
          ${context}
        </information>
  
        If the question is not relevant to the provided <information>, print("NOT_FOUND") and return.
        Otherwise, you may - very concisely - answer the user using only the relevant <information>.
  
        <question>${question}</question>`;

      response = await fetchPrompt(
        { ...options, prompt, mode: BaseUtils.ai.PROMPT_MODE.PROMPT },
        generativeModel,
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
  }: {
    data: KnowledgeBaseResponse;
    prompt: string;
    memory: BaseUtils.ai.Message[];
    variables?: Record<string, any>;
    options?: Partial<BaseUtils.ai.AIModelParams>;
  }): Promise<AIResponse | null> {
    const options = {
      model,
      system,
      temperature,
      maxTokens,
    };

    const knowledge = data.chunks.map(({ content }, index) => `<${index + 1}>${content}</${index + 1}>`).join('\n');
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
    return fetchChat({ ...options, messages: questionMessages }, generativeModel, variables, {
      retries: this.DEFAULT_ANSWER_SYNTHESIS_RETRIES,
      retryDelay: this.DEFAULT_ANSWER_SYNTHESIS_RETRY_DELAY_MS,
    });
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

      const query = await this.promptQuestionSynthesis({ prompt, variables, memory });
      if (!query || !query.output) return null;

      const data = await fetchKnowledgeBase(projectID, workspaceID, query.output);

      if (!data) return null;

      const answer = await this.promptAnswerSynthesis({
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
  }

  async questionSynthesis(question: string, memory: BaseUtils.ai.Message[]): Promise<AIResponse> {
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
  }: {
    prompt: string;
    memory: BaseUtils.ai.Message[];
    variables?: Record<string, any>;
    options?: Partial<BaseUtils.ai.AIModelParams>;
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
    return fetchChat({ ...options, messages: questionMessages }, generativeModel, variables, {
      retries: this.DEFAULT_QUESTION_SYNTHESIS_RETRIES,
      retryDelay: this.DEFAULT_QUESTION_SYNTHESIS_RETRY_DELAY_MS,
    });
  }
}

export default AISynthesis;
