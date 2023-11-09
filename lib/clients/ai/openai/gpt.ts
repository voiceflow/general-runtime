import { BaseUtils } from '@voiceflow/base-types';
import { ChatCompletionRequestMessageRoleEnum } from '@voiceflow/openai';

import { Config } from '@/types';

import { AIModel } from '../ai-model';
import { ContentModerationClient } from '../contentModeration';
import { OpenAIClient } from './api-client';

export abstract class GPTAIModel extends AIModel {
  protected abstract gptModelName: string;

  protected readonly client: OpenAIClient;

  static RoleMapping = {
    [BaseUtils.ai.Role.ASSISTANT]: ChatCompletionRequestMessageRoleEnum.Assistant,
    [BaseUtils.ai.Role.SYSTEM]: ChatCompletionRequestMessageRoleEnum.System,
    [BaseUtils.ai.Role.USER]: ChatCompletionRequestMessageRoleEnum.User,
  };

  constructor(config: Config, protected readonly contentModerationClient: ContentModerationClient | null) {
    super(config);
    this.client = new OpenAIClient(config);
  }

  protected calculateTokenMultiplier(tokens: number): number {
    return Math.ceil(tokens * this.TOKEN_MULTIPLIER);
  }
}
