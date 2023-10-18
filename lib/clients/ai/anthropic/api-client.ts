import Client from '@anthropic-ai/sdk';

import { AnthropicConfig } from './anthropic.interface';

export class AnthropicAIClient {
  client: Client;

  constructor(config: AnthropicConfig) {
    if (!config.ANTHROPIC_API_KEY) {
      throw new Error(`Anthropic client not initialized`);
    }

    this.client = new Client({ apiKey: config.ANTHROPIC_API_KEY, timeout: config.AI_GENERATION_TIMEOUT });
  }
}
