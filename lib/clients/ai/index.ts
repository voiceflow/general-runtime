import { BaseUtils } from '@voiceflow/base-types';

import log from '@/logger';
import type { Config } from '@/types';

import Unleash from '../unleash';
import { AbstractClient } from '../utils';
import { AIModel } from './ai-model';
import { ClaudeV1 } from './anthropic/claude_v1';
import { ClaudeV1Instant } from './anthropic/claude_v1_instant';
import { ClaudeV2 } from './anthropic/claude_v2';
import { OpenAIModerationClient } from './contentModeration/openai/openai';
import { GPT3 } from './openai/gpt3';
import { GPT3_5 } from './openai/gpt3_5';
import { GPT4 } from './openai/gpt4';
import { GPT4Turbo } from './openai/gpt4turbo';

export class AIClient extends AbstractClient {
  private DEFAULT_MODEL = BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo;

  models: Partial<Record<BaseUtils.ai.GPT_MODEL, AIModel>> = {};

  constructor(config: Config, unleash: Unleash) {
    super(config);

    const contentModerationClient = new OpenAIModerationClient(config, unleash);

    const setModel = (modelName: BaseUtils.ai.GPT_MODEL, getModel: () => AIModel) => {
      try {
        this.models[modelName] = getModel();
      } catch (error) {
        log.warn(`failed to initialize ${modelName} ${log.vars({ error })}`);
      }
    };

    setModel(BaseUtils.ai.GPT_MODEL.DaVinci_003, () => new GPT3(config, contentModerationClient));
    setModel(BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo, () => new GPT3_5(config, contentModerationClient));
    setModel(BaseUtils.ai.GPT_MODEL.GPT_4, () => new GPT4(config, contentModerationClient));
    setModel(BaseUtils.ai.GPT_MODEL.GPT_4_turbo, () => new GPT4Turbo(config, contentModerationClient));
    setModel(BaseUtils.ai.GPT_MODEL.CLAUDE_V1, () => new ClaudeV1(config, contentModerationClient));
    setModel(BaseUtils.ai.GPT_MODEL.CLAUDE_V2, () => new ClaudeV2(config, contentModerationClient));
    setModel(BaseUtils.ai.GPT_MODEL.CLAUDE_INSTANT_V1, () => new ClaudeV1Instant(config, contentModerationClient));
  }

  get(modelName: BaseUtils.ai.GPT_MODEL = this.DEFAULT_MODEL): AIModel | null {
    const model = this.models[modelName];

    if (!model) {
      log.warn(`no model found for ${modelName}`);
    }

    return model ?? null;
  }
}

export default AIClient;
