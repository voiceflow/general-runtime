import { AzureKeyCredential, OpenAIClient, OpenAIKeyCredential, RequestOptions } from '@azure/openai';
import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';

import log from '@/logger';
import { Config } from '@/types';

import { GPTAIModel, Message } from './types';

export class GPT3 extends GPTAIModel {
  public modelName = BaseUtils.ai.GPT_MODEL.DaVinci_003;

  private client: OpenAIClient & RequestOptions;

  constructor(config: Config) {
    super();

    if (config.AZURE_ENDPOINT && config.AZURE_OPENAI_API_KEY && config.AZURE_GPT3_DEPLOYMENTS) {
      this.client = new OpenAIClient(config.AZURE_ENDPOINT, new AzureKeyCredential(config.AZURE_OPENAI_API_KEY));
      this.setDeployments(config.AZURE_GPT3_DEPLOYMENTS);
      return;
    }

    if (config.OPENAI_API_KEY) {
      const openAIKeyCredential = new OpenAIKeyCredential(config.OPENAI_API_KEY);
      this.client = new OpenAIClient(openAIKeyCredential);

      // this is a temporary fix until microsoft merges this PR: https://github.com/Azure/azure-sdk-for-js/pull/26023
      this.client.requestOptions = { headers: { Authorization: openAIKeyCredential.key } };
      this.setDeployments(this.modelName);
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
    const result = await this.client
      .getCompletions(this.deployment, [prompt], {
        ...params,
        requestOptions: this.client.requestOptions,
      })
      .catch((error) => {
        log.warn(`GPT3 completion ${log.vars({ error, prompt, params })})}`);
        return null;
      });

    return result?.choices[0].text ?? null;
  }

  // turn messages into a singular prompt
  async generateChatCompletion(messages: Message[], params: AIModelParams) {
    return this.generateCompletion(GPT3.messagesToPrompt(messages), params);
  }
}
