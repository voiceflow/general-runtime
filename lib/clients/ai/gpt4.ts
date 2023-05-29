import { OpenAIClient, OpenAIKeyCredential, RequestOptions } from '@azure/openai';
import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';

import log from '@/logger';
import { Config } from '@/types';

import { GPTAIModel, Message } from './types';

export class GPT4 extends GPTAIModel {
  public modelName = BaseUtils.ai.GPT_MODEL.GPT_4;

  private client: OpenAIClient & RequestOptions;

  constructor(config: Config) {
    super();

    // we dont not have access to GPT 4 on Azure yet, use OpenAI API instead
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
        log.warn(`GPT4 completion ${log.vars({ error, prompt, params })})}`);
        return null;
      });

    return result?.choices[0].message?.content ?? null;
  }
}
