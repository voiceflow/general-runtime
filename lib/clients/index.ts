import { RateLimitClient } from '@voiceflow/backend-utils';

import { MongoSession } from '@/lib/services/session';
import { Config } from '@/types';

import Analytics, { AnalyticsSystem } from './analytics';
import DataAPI from './dataAPI';
import Metrics, { MetricsType } from './metrics';
import MongoDB from './mongodb';
import { RedisClient } from './redis';
import Static, { StaticType } from './static';

export interface ClientMap extends StaticType {
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

  return {
    ...Static,
    dataAPI: new DataAPI(config),
    metrics: Metrics(config),
    redis,
    rateLimitClient: RateLimitClient('general-runtime', redis, config),
    mongo: MongoSession.enabled(config) ? new MongoDB(config) : null,
    analyticsClient: Analytics(config),
  };
};

export const initClients = async (clients: ClientMap) => {
  await clients.dataAPI.init();
  await clients.mongo?.start();
};

export const stopClients = async (_config: Config, clients: ClientMap) => {
  await clients.mongo?.stop();
  await clients.metrics?.stop();
};

export default buildClients;
