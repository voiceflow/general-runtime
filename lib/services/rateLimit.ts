import VError from '@voiceflow/verror';
import { Request, Response } from 'express';
import { RateLimiterRes } from 'rate-limiter-flexible';

import { AbstractManager } from './utils';

class RateLimit extends AbstractManager {
  setHeaders(res: Response, rateLimiterRes: RateLimiterRes, maxPoints: number) {
    res.setHeader('X-RateLimit-Limit', maxPoints);
    res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toString());
  }

  async consume(req: Request, res: Response) {
    const isPublic = !req.headers.authorization;
    const resource = isPublic ? req.params.versionID : req.headers.authorization;
    const maxPoints = isPublic ? this.config.RATE_LIMITER_POINTS_PUBLIC : this.config.RATE_LIMITER_POINTS_PRIVATE;
    const rateLimiterClient = this.services.rateLimiterClient[isPublic ? 'public' : 'private'];

    try {
      const rateLimiterRes = await rateLimiterClient.consume(resource!);

      this.services.rateLimit.setHeaders(res, rateLimiterRes, maxPoints);
    } catch (rateLimiterRes) {
      res.setHeader('Retry-After', Math.floor(rateLimiterRes.msBeforeNext / 1000));

      this.services.rateLimit.setHeaders(res, rateLimiterRes, maxPoints);

      throw new VError('Too Many Request', VError.HTTP_STATUS.TOO_MANY_REQUESTS);
    }
  }
}

export default RateLimit;
