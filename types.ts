import { RateLimitConfig, Validator } from '@voiceflow/backend-utils';
import { Config as RequestConfig, GeneralTrace } from '@voiceflow/general-types';
import * as Express from 'express';
import http from 'http';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import CacheDataAPI from '@/lib/services/state/cacheDataAPI';

import * as Runtime from './runtime';

export interface Config extends RateLimitConfig {
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
  DISABLE_ORIGIN_CHECK: boolean;

  ADMIN_SERVER_DATA_API_TOKEN: string | null;
  VF_DATA_ENDPOINT: string | null;
  // Logging
  LOG_LEVEL: string | null;
  MIDDLEWARE_VERBOSITY: string | null;

  PROJECT_SOURCE: string | null;

  REDIS_CLUSTER_HOST: string | null;
  REDIS_CLUSTER_PORT: number | null;

  SESSIONS_SOURCE: string | null;
  MONGO_URI: string | null;
  MONGO_DB: string | null;
}

export interface Request<P extends {} = {}, B = any, H extends {} = {}, Q = any, RB = any> extends Express.Request<P, RB, B, Q> {
  headers: http.IncomingHttpHeaders & H;
}

export type Response = Express.Response;

export type Next = () => void;

export interface Route<P = {}, T = void> {
  (req: Request<P>): Promise<T>;

  validations?: Validator.ValidationChain[];
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

export type Context = Runtime.Context<RuntimeRequest, GeneralTrace, ContextData>;
export type ContextHandler = Runtime.ContextHandler<Context>;
export type InitContextHandler = Runtime.InitContextHandler<Context>;
