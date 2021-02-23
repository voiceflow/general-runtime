import { Config } from '@/types';

import DataAPI from './dataAPI';
import Metrics, { MetricsType } from './metrics';
import { RateLimiterClient } from './rateLimiter';
import { RedisClient } from './redis';
import Static, { StaticType } from './static';

export interface ClientMap extends StaticType {
  dataAPI: DataAPI;
  metrics: MetricsType;
  redis: ReturnType<typeof RedisClient>;
  rateLimiterClient: ReturnType<typeof RateLimiterClient>;
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
  };
};

export const initClients = async (clients: ClientMap) => {
  await clients.dataAPI.init();
};

export default buildClients;
