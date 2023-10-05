import Client from '@anthropic-ai/sdk';

import { Config } from '@/types';

import { AbstractClient } from '../../utils';

export class AnthropicAIClient extends AbstractClient {
  client: Client;

  constructor(config: Config) {
    super(config);

    if (!config.ANTHROPIC_API_KEY) {
      throw new Error(`Anthropic client not initialized`);
    }

    this.client = new Client({ apiKey: config.ANTHROPIC_API_KEY, timeout: config.AI_GENERATION_TIMEOUT });
  }
}
