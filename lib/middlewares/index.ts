import { routeWrapper } from '@/lib/utils';
import { Config, MiddlewareGroup } from '@/types';

import { FullServiceMap } from '../services';
import Auth from './auth';
import Project from './project';
import RateLimit from './rateLimit';

export interface MiddlewareMap {
  rateLimit: RateLimit;
  project: Project;
  auth: Auth;
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
    project: new Project(services, config),
    auth: new Auth(services, config),
  };

  // everything before this will be route-wrapped
  routeWrapper(middlewares);

  return middlewares;
};

export default buildMiddleware;
