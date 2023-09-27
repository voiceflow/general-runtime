import { BaseUtils } from '@voiceflow/base-types';

import log from '@/logger';
import type { Config } from '@/types';

import UnleashClient from '../unleash';
import { AbstractClient } from '../utils';
import { ClaudeV1 } from './anthropic/claude_v1';
import { ClaudeV1Instant } from './anthropic/claude_v1_instant';
import { ClaudeV2 } from './anthropic/claude_v2';
import { GPT3 } from './openai/gpt3';
import { GPT3_5 } from './openai/gpt3_5';
import { GPT4 } from './openai/gpt4';
import { AIModel } from './types';

export class AIClient extends AbstractClient {
  private DEFAULT_MODEL = BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo;

  models: Partial<Record<BaseUtils.ai.GPT_MODEL, AIModel>> = {};

  constructor(config: Config, unleashClient: UnleashClient) {
    super(config);
    const setModel = (
      modelName: BaseUtils.ai.GPT_MODEL,
      Model: new (config: Config, unleashClient: UnleashClient) => AIModel
    ) => {
      try {
        this.models[modelName] = new Model(config, unleashClient);
      } catch (error) {
        log.warn(`failed to initialize ${modelName} ${log.vars({ error })}`);
      }
    };

    setModel(BaseUtils.ai.GPT_MODEL.DaVinci_003, GPT3);
    setModel(BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo, GPT3_5);
    setModel(BaseUtils.ai.GPT_MODEL.GPT_4, GPT4);
    setModel(BaseUtils.ai.GPT_MODEL.CLAUDE_V1, ClaudeV1);
    setModel(BaseUtils.ai.GPT_MODEL.CLAUDE_V2, ClaudeV2);
    setModel(BaseUtils.ai.GPT_MODEL.CLAUDE_INSTANT_V1, ClaudeV1Instant);
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
