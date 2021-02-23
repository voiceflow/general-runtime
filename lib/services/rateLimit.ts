import VError from '@voiceflow/verror';
import { Request, Response } from 'express';
import { RateLimiterRes } from 'rate-limiter-flexible';

import { AbstractManager } from './utils';

class RateLimit extends AbstractManager {
  setHeaders(res: Response, rateLimiterRes: RateLimiterRes) {
    res.setHeader('X-RateLimit-Limit', this.config.RATE_LIMITER_POINTS);
    res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toString());
  }

  async consume(req: Request, res: Response) {
    try {
      // rate limit by auth key
      if (req.headers.authorization) {
        const rateLimiterRes = await this.services.rateLimiterClient.consume(req.headers.authorization);
        this.services.rateLimit.setHeaders(res, rateLimiterRes);
      }
    } catch (rateLimiterRes) {
      res.setHeader('Retry-After', Math.floor(rateLimiterRes.msBeforeNext / 1000));

      this.services.rateLimit.setHeaders(res, rateLimiterRes);

      throw new VError('Too Many Request', VError.HTTP_STATUS.TOO_MANY_REQUESTS);
    }
  }
}

export default RateLimit;
