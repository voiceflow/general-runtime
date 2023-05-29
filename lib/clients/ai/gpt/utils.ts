import { Configuration, OpenAIApi } from '@voiceflow/openai';

import { Config } from '@/types';

import { AIModel } from '../types';

export abstract class GPTAIModel extends AIModel {
  protected TIMEOUT = 20000;

  protected client: OpenAIApi;

  constructor(config: Partial<Config>) {
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

    throw new Error(`OpenAI client not initialized`);
  }
}
