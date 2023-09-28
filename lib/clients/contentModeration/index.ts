import type { Config } from '@/types';

import UnleashClient from '../unleash';
import { AbstractClient } from '../utils';

export abstract class ContentModerationClient extends AbstractClient {
  constructor(config: Config, protected readonly unleashClient: UnleashClient) {
    super(config);
  }

  abstract checkModeration(input: string | string[]): Promise<void>;
}

export default ContentModerationClient;
