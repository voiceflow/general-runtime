import { RateLimitConfig, Validator } from '@voiceflow/backend-utils';
import { BaseRequest, BaseTrace } from '@voiceflow/base-types';
import * as Express from 'express';
import http from 'http';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import CacheDataAPI from '@/lib/services/state/cacheDataAPI';

import * as Runtime from './runtime';

export interface Config extends RateLimitConfig {
  NODE_ENV: string;
  PORT: string;
  PORT_METRICS: string | null;
  ERROR_RESPONSE_MS: number;

  CLOUD_ENV: string | null;
  IS_PRIVATE_CLOUD: boolean;

  AWS_ACCESS_KEY_ID: string | null;
  AWS_SECRET_ACCESS_KEY: string | null;
  AWS_REGION: string | null;
  AWS_ENDPOINT: string | null;

  DYNAMO_ENDPOINT: string | null;

  CODE_HANDLER_ENDPOINT: string | null;
  INTEGRATIONS_HANDLER_ENDPOINT: string;
  API_MAX_TIMEOUT_MS: number | null;
  API_MAX_CONTENT_LENGTH_BYTES: number | null;
  API_MAX_BODY_LENGTH_BYTES: number | null;

  // Release information
  GIT_SHA: string | null;
  BUILD_NUM: string | null;
  SEM_VER: string | null;
  BUILD_URL: string | null;

  GENERAL_SERVICE_ENDPOINT: string | null;
  LUIS_SERVICE_ENDPOINT: string | null;

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

  SESSIONS_SOURCE: string;
  MONGO_URI: string | null;
  MONGO_DB: string | null;

  ANALYTICS_ENDPOINT: string | null;
  ANALYTICS_WRITE_KEY: string | null;
  INGEST_V2_WEBHOOK_ENDPOINT: string | null;
}

export interface Request<
  P extends Record<string, any> = Record<string, any>,
  B = any,
  H extends Record<string, any> = Record<string, any>,
  Q = any,
  RB = any
> extends Express.Request<P, RB, B, Q> {
  headers: http.IncomingHttpHeaders & H;
}

export type Response = Express.Response;

export type Next = () => void;

export interface Route<P = Record<string, any>, T = void> {
  (req: Request<P>): Promise<T>;

  validations?: Validator.ValidationChain[];
  callback?: boolean;
  route?: unknown;
}

export type Controller = Record<string, Route>;

export type Middleware = (req: Request, res: Response, next: Next) => Promise<void>;

export type MiddlewareGroup = Record<string, Middleware>;

export interface Class<T, A extends any[]> {
  new (...args: A): T;
}
export type AnyClass = Class<any, any[]>;

export enum VersionAlias {
  /*
      LUIS only has staging and production slots. For our purposes, we implement
      a VF "development" version (`devVersion`) by hitting a LUIS model on its staging slot,
      that is, VF development === LUIS staging.

      On a future VF NLU, we might have our own convention like development, staging,
      *and* production.
   */
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
}

export const isVersionAlias = (value: unknown): value is VersionAlias => value === VersionAlias.DEVELOPMENT || value === VersionAlias.PRODUCTION;

export interface ContextData {
  api: CacheDataAPI;
  locale?: string;
  config?: BaseRequest.RequestConfig;
  reqHeaders?: {
    origin?: string;
    platform?: string;
    sessionid?: string;
    authorization?: string;
  };
}

export type Context = Runtime.Context<RuntimeRequest, BaseTrace.AnyTrace, ContextData>;
export type ContextHandler = Runtime.ContextHandler<Context>;
export type InitContextHandler = Runtime.InitContextHandler<Context>;
