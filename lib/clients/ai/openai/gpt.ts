import { BaseUtils } from '@voiceflow/base-types';
import { ChatCompletionRequestMessageRoleEnum } from '@voiceflow/openai';

import { Config } from '@/types';

import { AIModel } from '../ai-model';
import { AIModelContext } from '../ai-model.interface';
import { ContentModerationClient } from '../contentModeration';
import { OpenAIClient } from './api-client';

export abstract class GPTAIModel extends AIModel {
  protected abstract gptModelName: string;

  static RoleMapping = {
    [BaseUtils.ai.Role.ASSISTANT]: ChatCompletionRequestMessageRoleEnum.Assistant,
    [BaseUtils.ai.Role.SYSTEM]: ChatCompletionRequestMessageRoleEnum.System,
    [BaseUtils.ai.Role.USER]: ChatCompletionRequestMessageRoleEnum.User,
  };

  constructor(
    config: Config,
    protected readonly client: OpenAIClient,
    protected readonly contentModerationClient: ContentModerationClient,
    protected context: AIModelContext
  ) {
    super(config);
  }

  protected calculateTokenMultiplier(tokens: number): number {
    return Math.floor(tokens * this.TOKEN_MULTIPLIER);
  }
}
