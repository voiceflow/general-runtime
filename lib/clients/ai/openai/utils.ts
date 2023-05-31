import { BaseUtils } from '@voiceflow/base-types';
import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from '@voiceflow/openai';

import { Config } from '@/types';

import { AIModel } from '../types';

export abstract class GPTAIModel extends AIModel {
  protected TIMEOUT = 20000;

  protected azureClient?: OpenAIApi;

  protected openAIClient?: OpenAIApi;

  static RoleMapping = {
    [BaseUtils.ai.Role.ASSISTANT]: ChatCompletionRequestMessageRoleEnum.Assistant,
    [BaseUtils.ai.Role.SYSTEM]: ChatCompletionRequestMessageRoleEnum.System,
    [BaseUtils.ai.Role.USER]: ChatCompletionRequestMessageRoleEnum.User,
  };

  constructor(config: Partial<Config>) {
    super();

    if (config.AZURE_ENDPOINT && config.AZURE_OPENAI_API_KEY && config.AZURE_GPT35_DEPLOYMENTS) {
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

    if (config.OPENAI_API_KEY) {
      this.openAIClient = new OpenAIApi(new Configuration({ apiKey: config.OPENAI_API_KEY }));

      return;
    }

    throw new Error(`OpenAI client not initialized`);
  }

  get client(): OpenAIApi {
    // one of them is guaranteed to be initialized, otherwise there would be an error
    return (this.azureClient || this.openAIClient)!;
  }
}
