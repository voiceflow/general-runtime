import { RateLimiterMemory, RateLimiterRedis, RateLimiterStoreAbstract } from 'rate-limiter-flexible';

import { Config } from '@/types';

import { Redis } from './redis';

export type RateLimiter = RateLimiterStoreAbstract;

export const RateLimiterClient = (
  redis: Redis | null,
  { RATE_LIMITER_POINTS_PUBLIC, RATE_LIMITER_DURATION_PUBLIC, RATE_LIMITER_POINTS_PRIVATE, RATE_LIMITER_DURATION_PRIVATE }: Config
) => {
  const RateLimiter = redis ? RateLimiterRedis : RateLimiterMemory;
  return {
    // public rate limiter - req from creator-app or clients without an authorization
    public: new RateLimiter({
      points: RATE_LIMITER_POINTS_PUBLIC,
      duration: RATE_LIMITER_DURATION_PUBLIC,
      keyPrefix: 'general-runtime-rate-limiter-public',
      storeClient: redis,
    }),
    // private rate limiter - req from clients with authorization (auth_vf token or api key)
    private: new RateLimiter({
      points: RATE_LIMITER_POINTS_PRIVATE,
      duration: RATE_LIMITER_DURATION_PRIVATE,
      keyPrefix: 'general-runtime-rate-limiter-private',
      storeClient: redis,
    }),
  };
};
