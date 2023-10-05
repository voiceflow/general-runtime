import { BaseUtils } from '@voiceflow/base-types';
import { ChatCompletionRequestMessageRoleEnum, OpenAIApi } from '@voiceflow/openai';

import { Config } from '@/types';

import { AIModel } from '../ai-model';
import { AIModelContext } from '../ai-model.interface';
import { ContentModerationClient } from '../contentModeration';

export abstract class GPTAIModel extends AIModel {
  protected abstract gptModelName: string;

  protected openAIClient?: OpenAIApi;

  protected azureClient?: OpenAIApi;

  static RoleMapping = {
    [BaseUtils.ai.Role.ASSISTANT]: ChatCompletionRequestMessageRoleEnum.Assistant,
    [BaseUtils.ai.Role.SYSTEM]: ChatCompletionRequestMessageRoleEnum.System,
    [BaseUtils.ai.Role.USER]: ChatCompletionRequestMessageRoleEnum.User,
  };

  constructor(
    config: Config,
    protected readonly client: OpenAIApi,
    protected readonly contentModerationClient: ContentModerationClient,
    protected context: AIModelContext
  ) {
    super(config, client, contentModerationClient, context);
  }

  protected calculateTokenMultiplier(tokens: number): number {
    return Math.floor(tokens * this.TOKEN_MULTIPLIER);
  }
}
