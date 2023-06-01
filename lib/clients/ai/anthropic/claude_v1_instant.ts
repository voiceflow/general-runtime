import { BaseUtils } from '@voiceflow/base-types';

import { AnthropicAIModel } from './utils';

export class ClaudeV1Instant extends AnthropicAIModel {
  modelRef = BaseUtils.ai.GPT_MODEL.CLAUDE_INSTANT_V1;

  anthropicModel = 'claude-instant-v1';
}
