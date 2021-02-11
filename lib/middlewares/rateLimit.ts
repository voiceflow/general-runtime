import { NextFunction, Request, Response } from 'express';

import log from '@/logger';

import { AbstractMiddleware } from './utils';

class RateLimit extends AbstractMiddleware {
  async verify(req: Request<{}>, _res: Response, next: NextFunction) {
    if (
      !this.config.PROJECT_SOURCE &&
      (!this.config.CREATOR_APP_ORIGIN || req.headers.origin !== this.config.CREATOR_APP_ORIGIN) &&
      !req.headers.authorization
    ) {
      // throw new VError('Auth Key Required', VError.HTTP_STATUS.UNAUTHORIZED);
      log.info(`unauthenticated call: ${req.ip} ${req.headers.origin}`);
    }

    next();
  }

  async consume(req: Request<{}>, res: Response, next: NextFunction) {
    await this.services.rateLimit.consume(req, res);

    return next();
  }
}

export default RateLimit;
