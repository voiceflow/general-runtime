import { BaseUtils } from '@voiceflow/base-types';

import { AnthropicAIModel } from './utils';

export class ClaudeV1 extends AnthropicAIModel {
  public modelName = BaseUtils.ai.GPT_MODEL.CLAUDE_V1;
}
