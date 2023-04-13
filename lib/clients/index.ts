import { RateLimitClient } from '@voiceflow/backend-utils';
import { AuthSDK } from '@voiceflow/sdk-auth';
import fetch from 'node-fetch';

import { MongoSession } from '@/lib/services/session';
import { Config } from '@/types';

import Analytics, { AnalyticsSystem } from './analytics';
import DataAPI from './dataAPI';
import Metrics, { MetricsType } from './metrics';
import MongoDB from './mongodb';
import { RedisClient } from './redis';
import Static, { StaticType } from './static';

export interface ClientMap extends StaticType {
  auth: AuthSDK | null;
  dataAPI: DataAPI;
  metrics: MetricsType;
  redis: ReturnType<typeof RedisClient>;
  rateLimitClient: ReturnType<typeof RateLimitClient>;
  mongo: MongoDB | null;
  analyticsClient: AnalyticsSystem | null;
}

/**
 * Build all clients
 */
const buildClients = (config: Config): ClientMap => {
  const redis = RedisClient(config);
  const mongo = MongoSession.enabled(config) ? new MongoDB(config) : null;

  return {
    ...Static,
    redis,
    mongo,
    auth: config.AUTH_API_ENDPOINT
      ? new AuthSDK({ authServiceURI: config.AUTH_API_ENDPOINT, fetchPonyfill: fetch })
      : null,
    dataAPI: new DataAPI({ config, mongo }),
    metrics: Metrics(config),
    rateLimitClient: RateLimitClient('general-runtime', redis, config),
    analyticsClient: Analytics(config),
  };
};

export const initClients = async (clients: ClientMap) => {
  await clients.mongo?.start();
};

export const stopClients = async (_config: Config, clients: ClientMap) => {
  await clients.mongo?.stop();
  await clients.metrics?.stop();
};

export default buildClients;
