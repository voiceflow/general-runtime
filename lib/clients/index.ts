import { RateLimitClient } from '@voiceflow/backend-utils';

import { MongoSession } from '@/lib/services/session';
import { Config } from '@/types';

import AIClient from './ai';
import { AnalyticsClient } from './analytics-client';
import AnalyticsIngester, { IngesterClient } from './analytics-ingester';
import DataAPI from './dataAPI';
import Metrics, { MetricsType } from './metrics';
import MLGateway from './ml-gateway';
import MongoDB from './mongodb';
import { RedisClient } from './redis';
import Static, { StaticType } from './static';
import Unleash from './unleash';

export interface ClientMap extends StaticType {
  dataAPI: DataAPI;
  metrics: MetricsType;
  redis: ReturnType<typeof RedisClient>;
  rateLimitClient: ReturnType<typeof RateLimitClient>;
  mongo: MongoDB | null;
  analyticsIngester: IngesterClient | null;
  analyticsPlatform: AnalyticsClient;
  mlGateway: MLGateway;
  unleash: Unleash;
  ai: AIClient;
}

/**
 * Build all clients
 */
const buildClients = (config: Config): ClientMap => {
  const redis = RedisClient(config);
  const mongo = MongoSession.enabled(config) ? new MongoDB(config) : null;
  const unleash = new Unleash(config);

  return {
    ...Static,
    redis,
    mongo,
    dataAPI: new DataAPI({ config, mongo }),
    metrics: Metrics(config),
    mlGateway: new MLGateway(config),
    rateLimitClient: RateLimitClient('general-runtime', redis, config),
    analyticsIngester: AnalyticsIngester(config),
    analyticsPlatform: new AnalyticsClient(
      config.ANALYTICS_API_SERVICE_HOST && config.ANALYTICS_API_SERVICE_PORT_APP
        ? new URL(
            `${config.NODE_ENV === 'e2e' ? 'https' : 'http'}://${config.ANALYTICS_API_SERVICE_HOST}:${
              config.ANALYTICS_API_SERVICE_PORT_APP
            }`
          ).href
        : null
    ),
    unleash,
    ai: new AIClient(config, unleash),
  };
};

export const initClients = async (clients: ClientMap) => {
  await clients.unleash?.ready();
  await clients.mongo?.start();
  await clients.mlGateway?.start();
};

export const stopClients = async (_config: Config, clients: ClientMap) => {
  clients.unleash?.destroy();
  await clients.mongo?.stop();
  await clients.metrics?.stop();
};

export default buildClients;
