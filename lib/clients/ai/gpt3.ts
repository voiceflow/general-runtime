import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';
import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from '@voiceflow/openai';

import log from '@/logger';
import { Config } from '@/types';

import { AIModel, Message } from './types';

export class GPT3 extends AIModel {
  public modelName = BaseUtils.ai.GPT_MODEL.DaVinci_003;

  private client: OpenAIApi;

  constructor(config: Config) {
    super();

    if (config.AZURE_ENDPOINT && config.AZURE_OPENAI_API_KEY && config.AZURE_GPT35_DEPLOYMENTS) {
      this.client = new OpenAIApi(
        new Configuration({
          azure: {
            endpoint: config.AZURE_ENDPOINT,
            apiKey: config.AZURE_OPENAI_API_KEY,
            deploymentName: config.AZURE_GPT35_DEPLOYMENTS,
          },
        })
      );
      return;
    }

    if (config.OPENAI_API_KEY) {
      this.client = new OpenAIApi(new Configuration({ apiKey: config.OPENAI_API_KEY }));
      return;
    }

    throw new Error(`OpenAI client not initialized for ${this.modelName}`);
  }

  static messagesToPrompt(messages: Message[]) {
    if (messages.length === 1) {
      return `${messages[0].content.trim()}\n`;
    }

    const transcript = messages
      .map((message) => {
        if (message.role === ChatCompletionRequestMessageRoleEnum.User) {
          return `user: ${message.content}\n`;
        }
        if (message.role === ChatCompletionRequestMessageRoleEnum.Assistant) {
          return `bot: ${message.content}\n`;
        }
        return `${message.content}\n\n`;
      })
      .join();

    return `${transcript.trim()}\nuser: `;
  }

  async generateCompletion(prompt: string, params: AIModelParams) {
    const result = await this.client
      .createCompletion(
        {
          model: this.modelName,
          ...params,
          prompt,
        },
        { timeout: this.TIMEOUT }
      )
      .catch((error) => {
        log.warn(`GPT3 completion ${log.vars({ error, prompt, params })})}`);
        return null;
      });

    return result?.data.choices[0].text ?? null;
  }

  // turn messages into a singular prompt
  async generateChatCompletion(messages: Message[], params: AIModelParams) {
    return this.generateCompletion(GPT3.messagesToPrompt(messages), params);
  }
}
