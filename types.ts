import { Config as RequestConfig, GeneralRequest, GeneralTrace } from '@voiceflow/general-types';
import * as Runtime from '@voiceflow/runtime';
import * as Express from 'express';
import * as ExpressValidator from 'express-validator';

import CacheDataAPI from '@/lib/services/state/cacheDataAPI';

export interface Config {
  NODE_ENV: string;
  PORT: string;

  AWS_ACCESS_KEY_ID: string | null;
  AWS_SECRET_ACCESS_KEY: string | null;
  AWS_REGION: string | null;
  AWS_ENDPOINT: string | null;

  DATADOG_API_KEY: string;
  DYNAMO_ENDPOINT: string | null;

  CODE_HANDLER_ENDPOINT: string | null;
  INTEGRATIONS_HANDLER_ENDPOINT: string;
  API_HANDLER_ENDPOINT: string | null;

  // Release information
  GIT_SHA: string | null;
  BUILD_NUM: string | null;
  SEM_VER: string | null;
  BUILD_URL: string | null;

  GENERAL_SERVICE_ENDPOINT: string;

  CREATOR_API_ENDPOINT: string | null;
  CREATOR_API_AUTHORIZATION: string | null;

  CREATOR_APP_ORIGIN: string | null;

  ADMIN_SERVER_DATA_API_TOKEN: string | null;
  VF_DATA_ENDPOINT: string | null;
  // Logging
  LOG_LEVEL: string | null;
  MIDDLEWARE_VERBOSITY: string | null;

  PROJECT_SOURCE: string | null;
  SESSIONS_SOURCE: string | null;

  REDIS_CLUSTER_HOST: string | null;
  REDIS_CLUSTER_PORT: number | null;

  RATE_LIMITER_POINTS_PUBLIC: number;
  RATE_LIMITER_DURATION_PUBLIC: number;
  RATE_LIMITER_POINTS_PRIVATE: number;
  RATE_LIMITER_DURATION_PRIVATE: number;
}

export interface Request<P extends {} = {}> extends Express.Request<P> {
  headers: Record<string, string>;
  platform?: string;
  // timedout?: boolean;
}

export type Response = Express.Response;

export type Next = () => void;

export interface Route<P = {}, T = void> {
  (req: Request<P>): Promise<T>;

  validations?: ExpressValidator.ValidationChain[];
  callback?: boolean;
  route?: unknown;
}

export type Controller = Record<string, Route>;

export type Middleware = (req: Request, res: Response, next: Next) => Promise<void>;

export type MiddlewareGroup = Record<string, Middleware>;

export type Class<T, A extends any[]> = { new (...args: A): T };
export type AnyClass = Class<any, any[]>;

export type ContextData = {
  locale?: string;
  api: CacheDataAPI;
  config?: RequestConfig;
  reqHeaders?: {
    authorization?: string;
    origin?: string;
  };
};

export type Context = Runtime.Context<GeneralRequest, GeneralTrace, ContextData>;
export type ContextHandler = Runtime.ContextHandler<Context>;
export type InitContextHandler = Runtime.InitContextHandler<Context>;
