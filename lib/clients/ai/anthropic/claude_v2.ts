import { BaseUtils } from '@voiceflow/base-types';

import { AnthropicAIModel } from './utils';

export class ClaudeV2 extends AnthropicAIModel {
  TOKEN_MULTIPLIER = 10;

  modelRef = BaseUtils.ai.GPT_MODEL.CLAUDE_V2;

  anthropicModel = 'claude-2';
}
