import { RateLimitMiddleware } from '@voiceflow/backend-utils';
import { NextFunction, Request, Response } from 'express';

import { Config } from '@/types';

import { FullServiceMap } from '../services';

const LOCAL_DEVELOPEMENT = 'https://creator-local.development.voiceflow.com:3002';

class RateLimit extends RateLimitMiddleware<FullServiceMap, Config> {
  async verify(req: Request<{}>, _res: Response, next: NextFunction) {
    if (
      !this.config.PROJECT_SOURCE &&
      !this.config.DISABLE_ORIGIN_CHECK &&
      ![this.config.CREATOR_APP_ORIGIN, LOCAL_DEVELOPEMENT].includes(req.headers.origin || 'no-origin') &&
      !req.headers.authorization
    ) {
      RateLimitMiddleware.throwAuthError();
    }

    next();
  }

  async consume(req: Request<{}>, res: Response, next: NextFunction) {
    await this.services.rateLimit.consume(req, res);

    return next();
  }
}

export default RateLimit;
