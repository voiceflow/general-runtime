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

  S3_ACCESS_KEY_ID: string | null;
  S3_SECRET_ACCESS_KEY: string | null;
  S3_TLS_BUCKET: string | null;
  S3_ENDPOINT: string | null;

  CODE_HANDLER_ENDPOINT: string | null;
  INTEGRATIONS_HANDLER_ENDPOINT: string;
  API_REQUEST_TIMEOUT_MS: number | null;
  API_MAX_CONTENT_LENGTH_BYTES: number | null;
  API_MAX_BODY_LENGTH_BYTES: number | null;

  // Release information
  GIT_SHA: string | null;
  BUILD_NUM: string | null;
  SEM_VER: string | null;
  BUILD_URL: string | null;

  GENERAL_SERVICE_ENDPOINT: string | null;
  ML_GATEWAY_ENDPOINT: string | null;
  KNOWLEDGE_BASE_LAMBDA_ENDPOINT: string | null;

  AUTH_API_SERVICE_HOST: string | null;
  AUTH_API_SERVICE_PORT_APP: string | null;

  NLU_GATEWAY_SERVICE_HOST: string | null;
  NLU_GATEWAY_SERVICE_PORT_APP: string | null;

  CREATOR_API_ENDPOINT: string | null;
  CREATOR_API_AUTHORIZATION: string | null;

  CREATOR_APP_ORIGIN: string | null;
  DISABLE_ORIGIN_CHECK: boolean;

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

  // OpenAI LLM keys
  AZURE_OPEN_API_KEY: string | null;
  AZURE_OPEN_API_ENDPOINT: string | null;

  OPEN_API_KEY: string | null;
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

export interface Route<Params extends Record<string, any> = Record<string, any>, T = void> {
  (req: Request<Params>): Promise<T>;

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

export enum VersionTag {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
}

export const isVersionTag = (value: unknown): value is VersionTag =>
  value === VersionTag.DEVELOPMENT || value === VersionTag.PRODUCTION;

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
