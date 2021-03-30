import { MongoSession } from '@/lib/services/session';
import { Config } from '@/types';

import DataAPI from './dataAPI';
import Metrics, { MetricsType } from './metrics';
import MongoDB from './mongodb';
import { RateLimiterClient } from './rateLimiter';
import { RedisClient } from './redis';
import Static, { StaticType } from './static';

export interface ClientMap extends StaticType {
  dataAPI: DataAPI;
  metrics: MetricsType;
  redis: ReturnType<typeof RedisClient>;
  rateLimiterClient: ReturnType<typeof RateLimiterClient>;
  mongo: MongoDB | null;
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
    rateLimiterClient: RateLimiterClient(redis, config),
    mongo: MongoSession.enabled(config) ? new MongoDB(config) : null,
  };
};

export const initClients = async (clients: ClientMap) => {
  await clients.dataAPI.init();
  await clients.mongo?.start();
};

export const stopClients = async (_config: Config, clients: ClientMap) => {
  await clients.mongo?.stop();
};

export default buildClients;
