import { RateLimiterMemory, RateLimiterRedis, RateLimiterStoreAbstract } from 'rate-limiter-flexible';

import { Config } from '@/types';

import { Redis } from './redis';

export type RateLimiter = RateLimiterStoreAbstract;

// public rate limiter - req from creator-app or clients without an authorization
export const RATE_LIMITER_PUBLIC = 'general-runtime-rate-limiter-public';
// private rate limiter - req from clients with authorization (auth_vf token or api key)
export const RATE_LIMITER_PRIVATE = 'general-runtime-rate-limiter-private';

export const RateLimiterClient = (
  redis: Redis | null,
  { RATE_LIMITER_POINTS_PUBLIC, RATE_LIMITER_DURATION_PUBLIC, RATE_LIMITER_POINTS_PRIVATE, RATE_LIMITER_DURATION_PRIVATE }: Config
): { public: RateLimiter; private: RateLimiter } => {
  if (redis) {
    return {
      public: new RateLimiterRedis({
        points: RATE_LIMITER_POINTS_PUBLIC,
        duration: RATE_LIMITER_DURATION_PUBLIC,
        keyPrefix: RATE_LIMITER_PUBLIC,
        storeClient: redis,
      }),
      private: new RateLimiterRedis({
        points: RATE_LIMITER_POINTS_PRIVATE,
        duration: RATE_LIMITER_DURATION_PRIVATE,
        keyPrefix: RATE_LIMITER_PRIVATE,
        storeClient: redis,
      }),
    };
  }

  return {
    public: new RateLimiterMemory({
      points: RATE_LIMITER_POINTS_PUBLIC,
      duration: RATE_LIMITER_DURATION_PUBLIC,
      keyPrefix: RATE_LIMITER_PUBLIC,
    }),
    private: new RateLimiterMemory({
      points: RATE_LIMITER_POINTS_PRIVATE,
      duration: RATE_LIMITER_DURATION_PRIVATE,
      keyPrefix: RATE_LIMITER_PRIVATE,
    }),
  };
};
