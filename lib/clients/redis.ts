import IORedis from 'ioredis';

import { Config } from '@/types';

export type Redis = IORedis.Redis;

export const RedisClient = ({ REDIS_CLUSTER_HOST, REDIS_CLUSTER_PORT }: Config) => new IORedis(REDIS_CLUSTER_PORT, REDIS_CLUSTER_HOST);
