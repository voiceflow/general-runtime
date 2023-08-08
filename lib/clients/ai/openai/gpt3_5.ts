import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';

import log from '@/logger';

import { CompletionOutput } from '../types';
import { GPTAIModel } from './utils';

export class GPT3_5 extends GPTAIModel {
  public modelRef = BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo;

  protected gptModelName = 'gpt-3.5-turbo';

  async generateCompletion(prompt: string, params: AIModelParams) {
    const messages: BaseUtils.ai.Message[] = [{ role: BaseUtils.ai.Role.USER, content: prompt }];
    if (params.system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: params.system });

    return this.generateChatCompletion(messages, params);
  }

  async createCompletionWithRetry(
    messages: BaseUtils.ai.Message[],
    params: AIModelParams,
    cutoff?: number,
    retries = 0
  ): Promise<AxiosResponse<CreateChatCompletionResponse, any>> {
    /* 
      Will retry requests that take longer than cutoff until the last attempt,
      where it will use the default global timeout.
      Meant to be used to abort calls that may "instintcively" be taking too long.
    */

    let retryCount = 0;
    const requestMessages = messages.map(({ role, content }) => ({ role: GPTAIModel.RoleMapping[role], content }));

    while (retryCount <= retries) {
      try {
        // eslint-disable-next-line no-await-in-loop
        return await this.client.createChatCompletion(
          {
            model: this.gptModelName,
            max_tokens: params.maxTokens,
            temperature: params.temperature,
            messages: requestMessages,
          },
          { timeout: retryCount === retries ? this.TIMEOUT : cutoff || this.TIMEOUT }
        );
      } catch (error) {
        // timeout hit
        if (error.code === 'ECONNABORTED') {
          retryCount++;
        } else {
          throw error;
        }
      }
    }
    throw new Error(`Azure API call failed after ${retries} retries`);
  }

  async generateChatCompletion(
    messages: BaseUtils.ai.Message[],
    params: AIModelParams,
    client = this.client
  ): Promise<CompletionOutput | null> {
    try {
      let result;
      if (client === this.azureClient) {
        result = await this.createCompletionWithRetry(messages, params, 4000, 3);
      } else {
        result = await this.client.createChatCompletion(
          {
            model: this.gptModelName,
            max_tokens: params.maxTokens,
            temperature: params.temperature,
            messages: messages.map(({ role, content }) => ({ role: GPTAIModel.RoleMapping[role], content })),
          },
          { timeout: this.TIMEOUT }
        );
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
        return this.generateChatCompletion(messages, params, this.openAIClient);
      }

      return null;
    }
  }
}
