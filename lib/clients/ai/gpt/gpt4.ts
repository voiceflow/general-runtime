import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';
import { ChatCompletionRequestMessageRoleEnum } from '@voiceflow/openai';

import log from '@/logger';
import { Config } from '@/types';

import { Message } from '../types';
import { GPTAIModel } from './utils';

export class GPT4 extends GPTAIModel {
  public modelName = BaseUtils.ai.GPT_MODEL.GPT_4;

  constructor(config: Config) {
    // we dont not have access to GPT 4 on Azure yet, use OpenAI API instead
    super({ OPENAI_API_KEY: config.OPENAI_API_KEY });
  }

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
          ...params,
          messages,
        },
        { timeout: this.TIMEOUT }
      )
      .catch((error) => {
        log.warn(`GPT3_5 completion ${log.vars({ error, messages, params })})}`);
        return null;
      });

    return result?.data.choices[0].message?.content ?? null;
  }
}
