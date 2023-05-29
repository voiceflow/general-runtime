import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';
import { ChatCompletionRequestMessageRoleEnum } from '@voiceflow/openai';

import log from '@/logger';

import { Message } from '../types';
import { GPTAIModel } from './utils';

export class GPT3_5 extends GPTAIModel {
  public modelName = BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo;

  async generateCompletion(prompt: string, params: AIModelParams) {
    const messages: Message[] = [{ role: ChatCompletionRequestMessageRoleEnum.User, content: prompt }];
    if (params.system) messages.unshift({ role: ChatCompletionRequestMessageRoleEnum.System, content: params.system });

    return this.generateChatCompletion(messages, params);
  }

  async generateChatCompletion(
    messages: Message[],
    params: AIModelParams,
    client = this.client
  ): Promise<string | null> {
    try {
      const result = await client.createChatCompletion(
        {
          model: this.modelName,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          messages,
        },
        { timeout: this.TIMEOUT }
      );

      return result?.data.choices[0].message?.content ?? null;
    } catch (error) {
      log.warn(`GPT3.5 completion ${log.vars({ error: error?.response ?? error, messages, params })})}`);

      // if we fail on the azure instance due to rate limiting, retry with OpenAI API
      if (this.azureClient && error?.response?.status === 429 && this.openAIClient) {
        return this.generateChatCompletion(messages, params, this.openAIClient);
      }

      return null;
    }
  }
}
