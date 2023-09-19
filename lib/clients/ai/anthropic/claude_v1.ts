import { BaseUtils } from '@voiceflow/base-types';

import { AnthropicAIModel } from './anthropic';

export class ClaudeV1 extends AnthropicAIModel {
  TOKEN_MULTIPLIER = 10;

  modelRef = BaseUtils.ai.GPT_MODEL.CLAUDE_V1;

  anthropicModel = 'claude-v1';
}
