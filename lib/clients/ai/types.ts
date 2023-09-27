import { BaseUtils } from '@voiceflow/base-types';
import { Configuration, OpenAIApi } from '@voiceflow/openai';

import log from '@/logger';
import { Config } from '@/types';

import UnleashClient from '../unleash';
import { ModerationError } from './utils';

const LLM_MODERATION_FAIL_FF = 'LLM_MODERATION_FAIL_FF';

export abstract class AIModel {
  public abstract modelRef: BaseUtils.ai.GPT_MODEL;

  protected openAIClient?: OpenAIApi;

  protected TOKEN_MULTIPLIER = 1;

  protected readonly TIMEOUT: number;

  constructor(
    config: Pick<Config, 'AI_GENERATION_TIMEOUT' | 'OPENAI_API_KEY'>,
    private readonly unleashClient: UnleashClient
  ) {
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
    if (!this.openAIClient) return;

    if (!input || !input.length) return;
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

    failedModeration.forEach((failedModeration) => {
      const failedModerationCategories = Object.entries(failedModeration.error.categories).reduce<string[]>(
        (acc, [key, value]) => {
          if (value) acc.push(key);
          return acc;
        },
        []
      );
      log.warn(`[moderation error] input=${failedModeration.input} | categories=${failedModerationCategories}`);
    });

    if (this.unleashClient.isEnabled(LLM_MODERATION_FAIL_FF)) {
      throw new ModerationError(failedModeration);
    }
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
