import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';
import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from '@voiceflow/openai';

import log from '@/logger';
import { Config } from '@/types';

import { AIModel, Message } from './types';

export class GPT4 extends AIModel {
  public modelName = BaseUtils.ai.GPT_MODEL.GPT_4;

  private client: OpenAIApi;

  constructor(config: Config) {
    super();

    // we dont not have access to GPT 4 on Azure yet, use OpenAI API instead
    if (config.OPENAI_API_KEY) {
      this.client = new OpenAIApi(new Configuration({ apiKey: config.OPENAI_API_KEY }));
      return;
    }

    throw new Error(`OpenAI client not initialized for ${this.modelName}`);
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
        log.warn(`GPT4 completion ${log.vars({ error, messages, params })})}`);
        return null;
      });

    return result?.data.choices[0].message?.content ?? null;
  }
}
