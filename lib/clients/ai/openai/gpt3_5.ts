import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';
import { ChatCompletionRequestMessage } from '@voiceflow/openai';

import log from '@/logger';

import { CompletionOutput, CompletionRequestConfig } from '../types';
import { GPTAIModel } from './utils';

export class GPT3_5 extends GPTAIModel {
  public modelRef = BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo;

  protected gptModelName = 'gpt-3.5-turbo';

  async generateCompletion(prompt: string, params: AIModelParams, requestConfig?: CompletionRequestConfig) {
    const messages: BaseUtils.ai.Message[] = [{ role: BaseUtils.ai.Role.USER, content: prompt }];
    if (params.system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: params.system });

    return this.generateChatCompletion(messages, params, requestConfig);
  }

  async raceChatCompletionCalls(
    messages: ChatCompletionRequestMessage[],
    params: AIModelParams,
    delay = 4000,
    backupCalls = 0
  ): Promise<any> {
    /*
      Races maxCalls calls to openAI with delay inbetween each call.
      e.g. OpenAI call 1 -> wait [delay] ms -> OpenAI Call 2 -> OpenAI call 2 resolves -> return result 2.
      This is in response to latency spikes that impact random Azure OpenAI requests. 
    */

    let result;
    const chatCompletionPromises = [];
    for (let i = 0; i <= backupCalls; i++) {
      const chatCompletionPromise = this.client.createChatCompletion(
        {
          model: this.gptModelName,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          messages,
        },
        { timeout: this.TIMEOUT }
      );
      chatCompletionPromises.push(chatCompletionPromise);

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(resolve, delay);
      });

      // eslint-disable-next-line no-await-in-loop
      result = await Promise.race([...chatCompletionPromises, timeoutPromise]);

      // if the timeout is the race winner, result will be undefined and we continue the loop
      if (result) {
        return result;
      }
    }

    // if all retries are already invoked, wait for first one to finish
    return Promise.race([...chatCompletionPromises]);
  }

  async generateChatCompletion(
    messages: BaseUtils.ai.Message[],
    params: AIModelParams,
    requestConfig?: CompletionRequestConfig,
    client = this.client
  ): Promise<CompletionOutput | null> {
    try {
      let result;
      const formattedMessages = messages.map(({ role, content }) => ({ role: GPTAIModel.RoleMapping[role], content }));

      if (client === this.azureClient) {
        result = await this.raceChatCompletionCalls(
          formattedMessages,
          params,
          requestConfig?.backupInvocationDelay,
          requestConfig?.backupInvocations
        );
      } else {
        result = await this.client.createChatCompletion(
          {
            model: this.gptModelName,
            max_tokens: params.maxTokens,
            temperature: params.temperature,
            messages: formattedMessages,
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
        return this.generateChatCompletion(messages, params, requestConfig, this.openAIClient);
      }

      return null;
    }
  }
}
