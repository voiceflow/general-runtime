import { RateLimitClient } from '@voiceflow/backend-utils';
import { AnalyticsClient } from '@voiceflow/sdk-analytics';
import fetch from 'node-fetch';

import { MongoSession } from '@/lib/services/session';
import { Config } from '@/types';

import AnalyticsIngester, { IngesterClient } from './analytics-ingester';
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
  analyticsIngester: IngesterClient | null;
  analyticsClient: AnalyticsClient;
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
    dataAPI: new DataAPI({ config, mongo }),
    metrics: Metrics(config),
    rateLimitClient: RateLimitClient('general-runtime', redis, config),
    analyticsIngester: AnalyticsIngester(config),
    analyticsClient: new AnalyticsClient({
      fetchPonyfill: fetch,
      baseURL: new URL(
        `${config.NODE_ENV === 'e2e' ? 'https' : 'http'}://${config.ANALYTICS_API_SERVICE_HOST}:${
          config.ANALYTICS_API_SERVICE_PORT_APP
        }`
      ).href,
    }),
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
