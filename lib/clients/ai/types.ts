import { BaseUtils } from '@voiceflow/base-types';

export abstract class AIModel {
  public abstract modelRef: BaseUtils.ai.GPT_MODEL;

  protected TIMEOUT = 30000;

  protected TOKEN_MULTIPLIER = 1;

  abstract generateCompletion(prompt: string, params: BaseUtils.ai.AIModelParams): Promise<CompletionOutput | null>;

  abstract generateChatCompletion(
    messages: BaseUtils.ai.Message[],
    params: BaseUtils.ai.AIModelParams
  ): Promise<CompletionOutput | null>;
}

export interface CompletionOutput {
  output: string | null;
  tokens: number;
}

export const GPT4_ABLE_PLAN = new Set(['old_pro', 'old_team', 'pro', 'team', 'enterprise']);
