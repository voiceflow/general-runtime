import { BaseUtils } from '@voiceflow/base-types';
import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from '@voiceflow/openai';

import { Config } from '@/types';

import { AIModel } from '../types';
import { isAzureBasedGPTConfig } from './gpt.interface';

export abstract class GPTAIModel extends AIModel {
  protected abstract gptModelName: string;

  protected azureClient?: OpenAIApi;

  static RoleMapping = {
    [BaseUtils.ai.Role.ASSISTANT]: ChatCompletionRequestMessageRoleEnum.Assistant,
    [BaseUtils.ai.Role.SYSTEM]: ChatCompletionRequestMessageRoleEnum.System,
    [BaseUtils.ai.Role.USER]: ChatCompletionRequestMessageRoleEnum.User,
  };

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
      return;
    }

    if (!this.azureClient && !this.openAIClient) {
      throw new Error(`OpenAI client not initialized`);
    }
  }

  protected calculateTokenMultiplier(tokens: number): number {
    return Math.floor(tokens * this.TOKEN_MULTIPLIER);
  }

  get client(): OpenAIApi {
    // one of them is guaranteed to be initialized, otherwise there would be an error
    return (this.azureClient || this.openAIClient)!;
  }
}
