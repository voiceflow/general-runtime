import IORedis from 'ioredis';

import { Config } from '@/types';

export type Redis = IORedis.Redis;

export const RedisClient = ({ REDIS_CLUSTER_HOST, REDIS_CLUSTER_PORT }: Config) =>
  REDIS_CLUSTER_HOST && REDIS_CLUSTER_PORT ? new IORedis(Number(REDIS_CLUSTER_PORT), REDIS_CLUSTER_HOST) : null;
