import { BaseUtils } from '@voiceflow/base-types';

import CONFIG from '@/config';
import log from '@/logger';
import type { Config } from '@/types';

import { GPT3 } from './gpt3';
import { GPT3_5 } from './gpt3_5';
import { GPT4 } from './gpt4';
import { AIModel } from './types';

class AIClient {
  private DEFAULT_MODEL = BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo;

  models: Partial<Record<BaseUtils.ai.GPT_MODEL, AIModel>> = {};

  constructor(config: Config) {
    const setModel = (modelName: BaseUtils.ai.GPT_MODEL, Model: new (config: Config) => AIModel) => {
      try {
        this.models[modelName] = new Model(config);
      } catch (error) {
        log.warn(`failed to initialize ${modelName} ${log.vars({ error })}`);
      }
    };

    setModel(BaseUtils.ai.GPT_MODEL.DaVinci_003, GPT3);
    setModel(BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo, GPT3_5);
    setModel(BaseUtils.ai.GPT_MODEL.GPT_4, GPT4);
  }

  get(modelName: BaseUtils.ai.GPT_MODEL = this.DEFAULT_MODEL): AIModel | null {
    const model = this.models[modelName];

    if (!model) {
      log.warn(`no model found for ${modelName}`);
    }

    return model ?? null;
  }
}

export default new AIClient(CONFIG);
