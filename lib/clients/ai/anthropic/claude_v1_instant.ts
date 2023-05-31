import { BaseUtils } from '@voiceflow/base-types';

import { AnthropicAIModel } from './utils';

export class ClaudeV1Instant extends AnthropicAIModel {
  public modelRef = BaseUtils.ai.GPT_MODEL.CLAUDE_INSTANT_V1;

  protected anthropicModel = 'claude-instant-v1';
}
