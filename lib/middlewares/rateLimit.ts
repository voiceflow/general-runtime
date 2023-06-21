import { RateLimitMiddleware } from '@voiceflow/backend-utils';
import { NextFunction, Response } from 'express';

import { Config, Request } from '@/types';

import { FullServiceMap } from '../services';

const LOCAL_DEVELOPEMENT = [
  'https://creator-local.development.voiceflow.com:3002',
  'https://creator-local.development.voiceflow.com',
];

class RateLimit extends RateLimitMiddleware<FullServiceMap, Config> {
  constructor(services: FullServiceMap, config: Config) {
    super(services, config);

    // fix for unit tests
    Object.assign(this.consumeResource, { callback: true });
  }

  async verify(req: Request, _res: Response, next: NextFunction): Promise<void> {
    if (
      !this.config.PROJECT_SOURCE &&
      !this.config.DISABLE_ORIGIN_CHECK &&
      ![this.config.CREATOR_APP_ORIGIN, ...LOCAL_DEVELOPEMENT].includes(req.headers.origin || 'no-origin') &&
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

  consumeResource = (getResource: (req: Request) => string | undefined, prefix?: string, isPublic = false) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const resource = getResource(req);

      if (!resource) {
        res.sendStatus(401);
        return;
      }

      this.consume(res, next, {
        isPublic,
        resource: prefix ? `${prefix}:${resource}` : resource,
      });
    };
  };
}

export default RateLimit;
