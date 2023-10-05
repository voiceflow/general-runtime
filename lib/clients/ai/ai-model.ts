import { BaseUtils } from '@voiceflow/base-types';

import { Config } from '@/types';

import { AIModelContext, APIClient, CompletionOptions, CompletionOutput } from './ai-model.interface';
import ContentModerationClient from './contentModeration';

export abstract class AIModel {
  public abstract modelRef: BaseUtils.ai.GPT_MODEL;

  protected TOKEN_MULTIPLIER = 1;

  protected readonly TIMEOUT: number;

  constructor(
    config: Pick<Config, 'AI_GENERATION_TIMEOUT'>,
    protected readonly client: APIClient,
    protected readonly contentModerationClient: ContentModerationClient,
    protected context: AIModelContext
  ) {
    this.TIMEOUT = config.AI_GENERATION_TIMEOUT;
  }

  get tokenMultiplier() {
    return this.TOKEN_MULTIPLIER;
  }

  abstract generateCompletion(
    prompt: string,
    params: BaseUtils.ai.AIModelParams,
    options?: CompletionOptions
  ): Promise<CompletionOutput | null>;

  abstract generateChatCompletion(
    messages: BaseUtils.ai.Message[],
    params: BaseUtils.ai.AIModelParams,
    options?: CompletionOptions
  ): Promise<CompletionOutput | null>;
}
