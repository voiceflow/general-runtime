import { RateLimiterRedis } from 'rate-limiter-flexible';

import { Config } from '@/types';

import { Redis } from './redis';

export type RateLimiter = RateLimiterRedis;

export const RateLimiterClient = (
  redis: Redis,
  { RATE_LIMITER_POINTS_PUBLIC, RATE_LIMITER_DURATION_PUBLIC, RATE_LIMITER_POINTS_PRIVATE, RATE_LIMITER_DURATION_PRIVATE }: Config
) => ({
  // public rate limiter - req from creator-app or clients without an authorization
  public: new RateLimiterRedis({
    points: RATE_LIMITER_POINTS_PUBLIC,
    duration: RATE_LIMITER_DURATION_PUBLIC,
    keyPrefix: 'general-runtime-rate-limiter-public',
    storeClient: redis,
  }),
  // private rate limiter - req from clients with authorization (auth_vf token or api key)
  private: new RateLimiterRedis({
    points: RATE_LIMITER_POINTS_PRIVATE,
    duration: RATE_LIMITER_DURATION_PRIVATE,
    keyPrefix: 'general-runtime-rate-limiter-private',
    storeClient: redis,
  }),
});
