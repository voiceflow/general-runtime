import { RateLimiterRedis } from 'rate-limiter-flexible';

import { Config } from '@/types';

import { Redis } from './redis';

export type RateLimiter = RateLimiterRedis;

export const RateLimiterClient = (redis: Redis, { RATE_LIMITER_POINTS, RATE_LIMITER_DURATION }: Config) =>
  new RateLimiterRedis({
    points: RATE_LIMITER_POINTS,
    duration: RATE_LIMITER_DURATION,
    keyPrefix: 'general-runtime-rate-limiter',
    storeClient: redis,
  });
