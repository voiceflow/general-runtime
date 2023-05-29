import { AzureKeyCredential, OpenAIClient, OpenAIKeyCredential, RequestOptions } from '@azure/openai';
import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';

import log from '@/logger';
import { Config } from '@/types';

import { GPTAIModel, Message } from './types';

export class GPT3_5 extends GPTAIModel {
  public modelName = BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo;

  private client: OpenAIClient & RequestOptions;

  constructor(config: Config) {
    super();

    if (config.AZURE_ENDPOINT && config.AZURE_OPENAI_API_KEY && config.AZURE_GPT35_DEPLOYMENTS) {
      this.client = new OpenAIClient(config.AZURE_ENDPOINT, new AzureKeyCredential(config.AZURE_OPENAI_API_KEY));
      this.setDeployments(config.AZURE_GPT35_DEPLOYMENTS);
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

  async generateCompletion(prompt: string, params: AIModelParams) {
    const messages: Message[] = [{ role: 'user', content: prompt }];
    if (params.system) messages.unshift({ role: 'system', content: params.system });

    return this.generateChatCompletion(messages, params);
  }

  async generateChatCompletion(messages: Message[], params: AIModelParams) {
    const result = await this.client
      .getChatCompletions(this.deployment, messages, {
        ...params,
        requestOptions: this.client.requestOptions,
      })
      .catch((error) => {
        log.warn(`GPT3_5 completion ${log.vars({ error, messages, params })})}`);
        return null;
      });

    return result?.choices[0].message?.content ?? null;
  }
}
