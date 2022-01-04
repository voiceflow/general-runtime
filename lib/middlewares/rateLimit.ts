import { RateLimitMiddleware } from '@voiceflow/backend-utils';
import { NextFunction, Response } from 'express';

import { Config, Request } from '@/types';

import { FullServiceMap } from '../services';

const LOCAL_DEVELOPEMENT = 'https://creator-local.development.voiceflow.com:3002';

class RateLimit extends RateLimitMiddleware<FullServiceMap, Config> {
  async verify(req: Request, _res: Response, next: NextFunction): Promise<void> {
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

  async versionConsume(req: Request, res: Response, next: NextFunction): Promise<void> {
    const isPublic = RateLimitMiddleware.isUnauthorizedRequest(req);

    return this.consume(res, next, {
      isPublic,
      resource: isPublic ? req.headers.versionID : req.headers.authorization,
    });
  }
}

export default RateLimit;
