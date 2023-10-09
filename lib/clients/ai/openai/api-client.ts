import { Configuration, OpenAIApi } from '@voiceflow/openai';

import { Config } from '@/types';

import { AbstractClient } from '../../utils';
import { isAzureBasedGPTConfig, isOpenAIGPTConfig } from './gpt.interface';

export class OpenAIClient extends AbstractClient {
  openAIClient?: OpenAIApi;

  azureClient?: OpenAIApi;

  constructor(config: Config) {
    super(config);

    if (isAzureBasedGPTConfig(config)) {
      // remove trailing slash
      const endpoint = config.AZURE_ENDPOINT.replace(/\/$/, '');

      this.azureClient = new OpenAIApi(
        new Configuration({
          azure: {
            endpoint,
            apiKey: config.AZURE_OPENAI_API_KEY,
            deploymentName: config.AZURE_GPT35_DEPLOYMENTS,
          },
        })
      );
    }

    if (isOpenAIGPTConfig(config)) {
      this.openAIClient = new OpenAIApi(new Configuration({ apiKey: config.OPENAI_API_KEY }));
    }

    if (!this.openAIClient && !this.azureClient) {
      throw new Error(`OpenAI client not initialized`);
    }
  }

  get client(): OpenAIApi {
    // one of them is guaranteed to be initialized, otherwise there would be an error
    return (this.azureClient || this.openAIClient)!;
  }
}
