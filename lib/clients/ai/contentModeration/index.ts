import type { Config } from '@/types';

import UnleashClient from '../../unleash';
import { AbstractClient } from '../../utils';
import { AIModelContext } from '../ai-model.interface';

export abstract class ContentModerationClient extends AbstractClient {
  constructor(config: Config, protected readonly unleashClient: UnleashClient) {
    super(config);
  }

  abstract checkModeration(input: string | string[], context: AIModelContext): Promise<void>;
}

export default ContentModerationClient;
