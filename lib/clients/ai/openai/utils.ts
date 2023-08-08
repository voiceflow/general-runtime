import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';
import {
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  CreateChatCompletionResponse,
  OpenAIApi,
} from '@voiceflow/openai';
import { AxiosResponse } from 'axios';

import { Config } from '@/types';

import { AIModel } from '../types';

export abstract class GPTAIModel extends AIModel {
  protected abstract gptModelName: string;

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

  protected calculateTokenMultiplier(tokens: number): number {
    return Math.floor(tokens * this.TOKEN_MULTIPLIER);
  }

  get client(): OpenAIApi {
    // one of them is guaranteed to be initialized, otherwise there would be an error
    return (this.azureClient || this.openAIClient)!;
  }

  protected async createCompletionWithRetry(
    messages: BaseUtils.ai.Message[],
    params: AIModelParams,
    cutoff?: number,
    retries = 0
  ): Promise<AxiosResponse<CreateChatCompletionResponse, any>> {
    /* 
      Will retry requests that take longer than cutoff until the last attempt,
      where it will use the default global timeout.
      Meant to be used to abort calls that may "instintcively" be taking too long.
    */

    let retryCount = 0;
    const requestMessages = messages.map(({ role, content }) => ({ role: GPTAIModel.RoleMapping[role], content }));

    while (retryCount <= retries) {
      try {
        // eslint-disable-next-line no-await-in-loop
        return await this.client.createChatCompletion(
          {
            model: this.gptModelName,
            max_tokens: params.maxTokens,
            temperature: params.temperature,
            messages: requestMessages,
          },
          { timeout: retryCount === retries ? this.TIMEOUT : cutoff || this.TIMEOUT }
        );
      } catch (error) {
        // timeout hit
        if (error.code === 'ECONNABORTED') {
          retryCount++;
        } else {
          throw error;
        }
      }
    }
    throw new Error(`Azure API call failed after ${retries} retries`);
  }
}
