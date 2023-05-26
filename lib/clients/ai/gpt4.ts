import { OpenAIClient, OpenAIKeyCredential } from '@azure/openai';
import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';

import { Config } from '@/types';

import { AIModel, Message } from './types';

export class GPT4 extends AIModel {
  public modelName = BaseUtils.ai.GPT_MODEL.GPT_4;

  private client: OpenAIClient;

  constructor(config: Config) {
    super();

    // we dont not have access to GPT 4 on Azure yet, use OpenAI API instead
    if (config.OPEN_API_KEY) {
      this.client = new OpenAIClient(new OpenAIKeyCredential(config.OPEN_API_KEY));
      return;
    }

    throw new Error('OpenAI client not initialized');
  }

  async generateCompletion(prompt: string, params: AIModelParams) {
    return this.generateChatCompletion([{ role: 'user', content: prompt }], params);
  }

  async generateChatCompletion(messages: Message[], params: AIModelParams) {
    const result = await this.client.getChatCompletions(this.modelName, messages, params);

    return result.choices[0].message?.content ?? null;
  }
}
