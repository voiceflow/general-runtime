import { RateLimitClient, RateLimitMiddleware } from '@voiceflow/backend-utils';
import VError from '@voiceflow/verror';
import { NextFunction, Response } from 'express';

import { Request } from '@/types';

import { factory } from '../utils';
import { AbstractMiddleware } from './utils';

class LLMLimit extends AbstractMiddleware {
  private rateLimitClient: ReturnType<typeof RateLimitClient>;

  private MAX_POINTS = 5;

  constructor(...args: ConstructorParameters<typeof AbstractMiddleware>) {
    super(...args);

    this.rateLimitClient = RateLimitClient('general-runtime', args[0].redis, {
      RATE_LIMITER_DURATION_PRIVATE: 60,
      RATE_LIMITER_DURATION_PUBLIC: 60,
      RATE_LIMITER_POINTS_PRIVATE: this.MAX_POINTS,
      RATE_LIMITER_POINTS_PUBLIC: this.MAX_POINTS,
    });

    // fix for unit tests
    Object.assign(this.consumeResource, { callback: true });
  }

  @factory()
  consumeResource(getResource: (req: Request) => string | undefined, prefix?: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const resource = getResource(req);

      if (!resource) {
        res.sendStatus(401);
        return;
      }

      try {
        const rateLimiterRes = await this.rateLimitClient.private.consume(prefix ? `${prefix}:${resource}` : resource);

        RateLimitMiddleware.setHeaders(res, rateLimiterRes, this.MAX_POINTS);
      } catch (rateLimiterRes) {
        res.setHeader('Retry-After', Math.floor(rateLimiterRes.msBeforeNext / 1000));

        RateLimitMiddleware.setHeaders(res, rateLimiterRes, this.MAX_POINTS);

        res.status(VError.HTTP_STATUS.TOO_MANY_REQUESTS).send('Too Many Requests');
      }

      next();
    };
  }
}

export default LLMLimit;
