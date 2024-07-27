import { randomUUID } from 'crypto';
import * as Unleash from 'unleash-client';

import log from '@/logger';
import { Config } from '@/types';

import { AbstractClient } from '../utils';
import strategies from './strategies';

const REFRESH_INTERVAL = 1000 * 30; // 30 seconds

interface InternalContext {
  userID?: number;
  workspaceID?: number;
  organizationID?: number;
  workspaceCreatedAt?: string;
}

const awaitInstanceReady = (instance: Unleash.Unleash) =>
  new Promise((resolve, reject) => {
    instance.once('ready', resolve);
    instance.once('error', (error) => reject(error));
  });

export class UnleashClient extends AbstractClient {
  staticContext: Required<Pick<Unleash.Context, 'appName' | 'environment'>>;

  instance?: Unleash.Unleash;

  client = {
    isEnabled: (
      featureID: string,
      { userID, workspaceID, organizationID, workspaceCreatedAt }: InternalContext = {}
    ) => {
      const context = {
        ...(userID ? { userId: String(userID) } : {}),
        ...(workspaceID ? { workspaceId: workspaceID } : {}),
        ...(organizationID ? { organizationId: organizationID } : {}),
        ...(workspaceCreatedAt ? { workspaceCreatedAt } : {}),
      };

      return Unleash.isEnabled(featureID, context);
    },
  };

  constructor(config: Config) {
    super(config);

    this.staticContext = {
      appName: config.CLOUD_ENV,
      environment: config.DEPLOY_ENV,
    };

    if (!config.UNLEASH_URL || !config.UNLEASH_API_KEY) {
      return;
    }

    this.instance = Unleash.initialize({
      ...this.staticContext,
      url: config.UNLEASH_URL,
      strategies,
      instanceId: randomUUID(),
      disableMetrics: true,
      customHeaders: { Authorization: config.UNLEASH_API_KEY },
      refreshInterval: REFRESH_INTERVAL,
    });
  }

  isEnabled(featureID: string, context?: InternalContext) {
    return this.client.isEnabled(featureID, context);
  }

  async ready() {
    try {
      await awaitInstanceReady(this.instance!);
    } catch (e) {
      if (this.instance) {
        throw new Error();
      }

      log.warn(
        'WARNING: failed to initialize unleash client, falling back to mock client; all feature flags will be disabled'
      );

      Unleash.destroy();

      // replace with mock
      this.client = { isEnabled: () => false };
    }
  }

  destroy() {
    this.instance?.destroy();
  }
}

export default UnleashClient;
