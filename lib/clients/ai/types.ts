import { BaseUtils } from '@voiceflow/base-types';
import { Configuration, OpenAIApi } from '@voiceflow/openai';

import { Config } from '@/types';

import { ModerationError } from './utils';

export abstract class AIModel {
  public abstract modelRef: BaseUtils.ai.GPT_MODEL;

  protected openAIClient?: OpenAIApi;

  protected TOKEN_MULTIPLIER = 1;

  protected readonly TIMEOUT: number;

  constructor(config: Pick<Config, 'AI_GENERATION_TIMEOUT' | 'OPENAI_API_KEY'>) {
    this.TIMEOUT = config.AI_GENERATION_TIMEOUT;
    // all models have an openAPI client in order to make moderation calls
    if (config.OPENAI_API_KEY) {
      this.openAIClient = new OpenAIApi(new Configuration({ apiKey: config.OPENAI_API_KEY }));
    }
  }

  get tokenMultiplier() {
    return this.TOKEN_MULTIPLIER;
  }

  async checkModeration(input: string | string[]) {
    if (!this.openAIClient) return true;

    if (!input || !input.length) return true;
    const moderationResult = await this.openAIClient.createModeration({ input });

    const failedModeration = moderationResult.data.results.flatMap((result, idx) => {
      if (result.flagged) {
        return [
          {
            input: Array.isArray(input) ? input[idx] : input,
            error: result,
          },
        ];
      }
      return [];
    });
    if (failedModeration.length) {
      throw new ModerationError(failedModeration);
    }
    return true;
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
