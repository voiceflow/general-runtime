import { BaseUtils } from '@voiceflow/base-types';
import { match } from 'ts-pattern';

import log from '@/logger';
import type { Config } from '@/types';

import Unleash from '../unleash';
import { AbstractClient } from '../utils';
import { AIModel } from './ai-model';
import { AIModelContext } from './ai-model.interface';
import { AnthropicAIClient } from './anthropic/api-client';
import { ClaudeV1 } from './anthropic/claude_v1';
import { ClaudeV1Instant } from './anthropic/claude_v1_instant';
import { ClaudeV2 } from './anthropic/claude_v2';
import ContentModerationClient from './contentModeration';
import { OpenAIModerationClient } from './contentModeration/openai/openai';
import { OpenAIClient } from './openai/api-client';
import { GPT3 } from './openai/gpt3';
import { GPT3_5 } from './openai/gpt3_5';
import { GPT4 } from './openai/gpt4';

export class AIClient extends AbstractClient {
  private DEFAULT_MODEL = BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo;

  private openAIClient: OpenAIClient;

  private anthropicClient: AnthropicAIClient;

  private contentModerationClient: ContentModerationClient;

  constructor(config: Config, unleash: Unleash) {
    super(config);

    this.openAIClient = new OpenAIClient(config);
    this.anthropicClient = new AnthropicAIClient(config);
    this.contentModerationClient = new OpenAIModerationClient(config, unleash);
  }

  get(modelName: BaseUtils.ai.GPT_MODEL, context: AIModelContext): AIModel | null {
    return match(modelName ?? this.DEFAULT_MODEL)
      .with(
        BaseUtils.ai.GPT_MODEL.DaVinci_003,
        () => new GPT3(this.config, this.openAIClient, this.contentModerationClient, context)
      )
      .with(
        BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo,
        () => new GPT3_5(this.config, this.openAIClient, this.contentModerationClient, context)
      )
      .with(
        BaseUtils.ai.GPT_MODEL.GPT_4,
        () => new GPT4(this.config, this.openAIClient, this.contentModerationClient, context)
      )
      .with(
        BaseUtils.ai.GPT_MODEL.CLAUDE_V1,
        () => new ClaudeV1(this.config, this.anthropicClient, this.contentModerationClient, context)
      )
      .with(
        BaseUtils.ai.GPT_MODEL.CLAUDE_V2,
        () => new ClaudeV2(this.config, this.anthropicClient, this.contentModerationClient, context)
      )
      .with(
        BaseUtils.ai.GPT_MODEL.CLAUDE_INSTANT_V1,
        () => new ClaudeV1Instant(this.config, this.anthropicClient, this.contentModerationClient, context)
      )
      .otherwise(() => {
        log.warn(`no model found for ${modelName ?? this.DEFAULT_MODEL}`);
        return null;
      });
  }
}

export default AIClient;
