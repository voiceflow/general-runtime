import { BaseUtils } from '@voiceflow/base-types';

import { AnthropicAIModel } from './utils';

export class ClaudeV1 extends AnthropicAIModel {
  public modelRef = BaseUtils.ai.GPT_MODEL.CLAUDE_V1;

  protected anthropicModel = 'claude-v1';
}
