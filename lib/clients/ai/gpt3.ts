import { AzureKeyCredential, OpenAIClient, OpenAIKeyCredential } from '@azure/openai';
import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';

import { Config } from '@/types';

import { AIModel, Message } from './types';

export class GPT3 extends AIModel {
  public modelName = BaseUtils.ai.GPT_MODEL.DaVinci_003;

  private client: OpenAIClient;

  constructor(config: Config) {
    super();

    if (config.AZURE_OPEN_API_ENDPOINT && config.AZURE_OPEN_API_KEY) {
      this.client = new OpenAIClient(config.AZURE_OPEN_API_ENDPOINT, new AzureKeyCredential(config.AZURE_OPEN_API_KEY));
      return;
    }

    if (config.OPEN_API_KEY) {
      this.client = new OpenAIClient(new OpenAIKeyCredential(config.OPEN_API_KEY));
      return;
    }

    throw new Error('OpenAI client not initialized');
  }

  static messagesToPrompt(messages: Message[]) {
    if (messages.length === 1) {
      return `${messages[0].content.trim()}\n`;
    }

    const transcript = messages
      .map((message) => {
        if (message.role === 'user') {
          return `user: ${message.content}\n`;
        }
        if (message.role === 'assistant') {
          return `bot: ${message.content}\n`;
        }
        return `${message.content}\n\n`;
      })
      .join();

    return `${transcript.trim()}\nuser: `;
  }

  async generateCompletion(prompt: string, params: AIModelParams) {
    const result = await this.client.getCompletions(this.modelName, [prompt], params);

    return result.choices[0].text;
  }

  // turn messages into a singular prompt
  async generateChatCompletion(messages: Message[], params: AIModelParams) {
    return this.generateCompletion(GPT3.messagesToPrompt(messages), params);
  }
}
