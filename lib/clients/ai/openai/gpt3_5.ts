import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';

import log from '@/logger';

import { CompletionOptions, CompletionOutput } from '../ai-model.interface';
import { delayedPromiseRace } from '../utils';
import { GPTAIModel } from './gpt';

export class GPT3_5 extends GPTAIModel {
  public modelRef = BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo;

  protected gptModelName = 'gpt-3.5-turbo';

  async generateCompletion(prompt: string, params: AIModelParams, options?: CompletionOptions) {
    const messages: BaseUtils.ai.Message[] = [{ role: BaseUtils.ai.Role.USER, content: prompt }];
    if (params.system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: params.system });

    return this.generateChatCompletion(messages, params, options);
  }

  async generateChatCompletion(
    messages: BaseUtils.ai.Message[],
    params: AIModelParams,
    options?: CompletionOptions,
    client = this.azureClient
  ): Promise<CompletionOutput | null> {
    await this.contentModerationClient.checkModeration(
      messages.map((message) => message.content),
      this.context
    );

    const resolveCompletion = () =>
      this.client.createChatCompletion(
        {
          model: this.gptModelName,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          messages: messages.map(({ role, content }) => ({ role: GPTAIModel.RoleMapping[role], content })),
        },
        { timeout: this.TIMEOUT }
      );

    try {
      let result;
      if (client === this.azureClient) {
        result = await delayedPromiseRace(resolveCompletion, options?.retryDelay ?? 5000, options?.retries ?? 1);
      } else {
        result = await resolveCompletion();
      }

      const output = result?.data.choices[0].message?.content ?? null;
      const tokens = result?.data.usage?.total_tokens ?? 0;
      const queryTokens = result?.data.usage?.prompt_tokens ?? 0;
      const answerTokens = result?.data.usage?.completion_tokens ?? 0;

      return {
        output,
        tokens: this.calculateTokenMultiplier(tokens),
        queryTokens: this.calculateTokenMultiplier(queryTokens),
        answerTokens: this.calculateTokenMultiplier(answerTokens),
      };
    } catch (error) {
      const truncatedMessages = messages.slice(0, 10).map(({ content, ...rest }) => ({
        ...rest,
        content: content.substring(0, 256),
      }));
      const truncatedParams = {
        ...params,
        system: params.system?.substring(0, 512),
      };
      log.warn(
        `GPT3.5 completion ${log.vars({
          error: error?.message,
          code: error?.code,
          messages: truncatedMessages,
          params: truncatedParams,
        })})}`
      );

      // if we fail on the azure instance due to rate limiting, retry with OpenAI API
      if (client === this.azureClient && error?.response?.status === 429 && this.openAIClient) {
        return this.generateChatCompletion(messages, params, options, this.openAIClient);
      }

      return null;
    }
  }
}
