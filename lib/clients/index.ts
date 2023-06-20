import { RateLimitClient } from '@voiceflow/backend-utils';
import Hashids from 'hashids';

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
  workspaceHashID: Hashids | null;
}

/**
 * Build all clients
 */
const buildClients = (config: Config): ClientMap => {
  const redis = RedisClient(config);
  const mongo = MongoSession.enabled(config) ? new MongoDB(config) : null;

  const workspaceHashID = config.HASHED_WORKSPACE_ID_SALT ? new Hashids(config.HASHED_WORKSPACE_ID_SALT, 10) : null;

  return {
    ...Static,
    redis,
    mongo,
    dataAPI: new DataAPI({ config, mongo }),
    metrics: Metrics(config),
    rateLimitClient: RateLimitClient('general-runtime', redis, config),
    analyticsClient: Analytics(config),
    workspaceHashID,
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
