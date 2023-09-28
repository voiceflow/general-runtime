import { BaseUtils } from '@voiceflow/base-types';

import { Config } from '@/types';

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

export interface CompletionOutput {
  output: string | null;
  tokens: number;
  queryTokens: number;
  answerTokens: number;
}

export interface CompletionOptions {
  retries?: number;
  retryDelay?: number;
}

export const GPT4_ABLE_PLAN = new Set(['old_pro', 'old_team', 'pro', 'team', 'enterprise']);
