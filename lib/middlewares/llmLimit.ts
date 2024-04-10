import { RateLimitClient, RateLimitMiddleware } from '@voiceflow/backend-utils';
import VError from '@voiceflow/verror';
import { NextFunction, Response } from 'express';

import { Request } from '@/types';

import { AbstractMiddleware } from './utils';

class LLMLimit extends AbstractMiddleware {
  private rateLimitClient: ReturnType<typeof RateLimitClient>;

  constructor(...args: ConstructorParameters<typeof AbstractMiddleware>) {
    super(...args);

    this.rateLimitClient = RateLimitClient('general-runtime', args[0].redis, {
      RATE_LIMITER_DURATION_PRIVATE: this.config.RATE_LIMITER_DURATION_LLM,
      RATE_LIMITER_DURATION_PUBLIC: this.config.RATE_LIMITER_DURATION_LLM,
      RATE_LIMITER_POINTS_PRIVATE: this.config.RATE_LIMITER_POINTS_LLM,
      RATE_LIMITER_POINTS_PUBLIC: this.config.RATE_LIMITER_POINTS_LLM,
    });
  }

  consumeResource = (getResource: (req: Request) => string | undefined, prefix?: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const resource = getResource(req);

      if (!resource) {
        res.sendStatus(401);
        return;
      }

      try {
        const rateLimiterRes = await this.rateLimitClient.private.consume(
          prefix ? `${prefix}:${resource}` : resource
        );

        RateLimitMiddleware.setHeaders(res, rateLimiterRes, this.config.RATE_LIMITER_POINTS_LLM);
      } catch (rateLimiterRes) {
        res.setHeader('Retry-After', Math.floor(rateLimiterRes.msBeforeNext / 1000));

        RateLimitMiddleware.setHeaders(res, rateLimiterRes, this.config.RATE_LIMITER_POINTS_LLM);

        res.status(VError.HTTP_STATUS.TOO_MANY_REQUESTS).send('Too Many Requests');
      }

      next();
    };
  };
}

export default LLMLimit;
