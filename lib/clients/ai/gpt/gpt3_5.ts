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

  async generateChatCompletion(messages: Message[], params: AIModelParams) {
    const result = await this.client
      .createChatCompletion(
        {
          model: this.modelName,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          messages,
        },
        { timeout: this.TIMEOUT }
      )
      .catch((error) => {
        log.warn(`GPT3_5 completion ${log.vars({ error, messages, params, data: error?.response?.data?.error })})}`);
        return null;
      });

    return result?.data.choices[0].message?.content ?? null;
  }
}
