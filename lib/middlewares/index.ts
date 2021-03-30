import { routeWrapper } from '@/lib/utils';
import { Config, MiddlewareGroup } from '@/types';

import { FullServiceMap } from '../services';
import RateLimit from './rateLimit';
import Version from './version';

export interface MiddlewareMap {
  rateLimit: RateLimit;
  version: Version;
}

export interface MiddlewareClass<T = MiddlewareGroup> {
  new (services: FullServiceMap, config: Config): T;
}

/**
 * Build all middlewares
 */
const buildMiddleware = (services: FullServiceMap, config: Config) => {
  const middlewares: MiddlewareMap = {
    rateLimit: new RateLimit(services, config),
    version: new Version(services, config),
  };

  // everything before this will be route-wrapped
  routeWrapper(middlewares);

  return middlewares;
};

export default buildMiddleware;
