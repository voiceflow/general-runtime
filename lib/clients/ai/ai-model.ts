import { BaseUtils } from '@voiceflow/base-types';

import { Config } from '@/types';

import { CompletionOptions, CompletionOutput } from './ai-model.interface';

export abstract class AIModel {
  public abstract modelRef: BaseUtils.ai.GPT_MODEL;

  protected TOKEN_MULTIPLIER = 1;

  protected readonly TIMEOUT: number;

  constructor(config: Pick<Config, 'AI_GENERATION_TIMEOUT'>) {
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
