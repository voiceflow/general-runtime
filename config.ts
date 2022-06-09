/**
 * [[include:env.md]]
 * @packageDocumentation
 */

import './envSetup';

import { getOptionalProcessEnv, getRequiredProcessEnv } from '@voiceflow/backend-utils';

import { Config } from './types';

const NODE_ENV = getRequiredProcessEnv('NODE_ENV');
const CLOUD_ENV = getOptionalProcessEnv('CLOUD_ENV', 'public');

const CONFIG: Config = {
  FF_RUNTIME_LOGGING: getOptionalProcessEnv('FF_RUNTIME_LOGGING') === 'true',

  // Configs
  NODE_ENV,
  PORT: getRequiredProcessEnv('PORT'),
  PORT_METRICS: getOptionalProcessEnv('PORT_METRICS'),
  ERROR_RESPONSE_MS: Number(getOptionalProcessEnv('ERROR_RESPONSE_MS', (10 * 1000).toString())),

  CLOUD_ENV,

  IS_PRIVATE_CLOUD: NODE_ENV === 'production' && CLOUD_ENV !== 'public',

  AWS_ENDPOINT: getOptionalProcessEnv('AWS_ENDPOINT'),
  DYNAMO_ENDPOINT: getOptionalProcessEnv('DYNAMO_ENDPOINT'),

  // code block
  CODE_HANDLER_ENDPOINT: getOptionalProcessEnv('CODE_HANDLER_ENDPOINT'),
  // integrations block
  INTEGRATIONS_HANDLER_ENDPOINT: getOptionalProcessEnv('INTEGRATIONS_HANDLER_ENDPOINT') || 'none',
  // api-block
  API_MAX_TIMEOUT_MS: Number(getOptionalProcessEnv('API_MAX_TIMEOUT_MS')) || null,
  API_MAX_CONTENT_LENGTH_BYTES: Number(getOptionalProcessEnv('API_MAX_CONTENT_LENGTH_BYTES')) || null,
  API_MAX_BODY_LENGTH_BYTES: Number(getOptionalProcessEnv('API_MAX_BODY_LENGTH_BYTES')) || null,

  PROJECT_SOURCE: getOptionalProcessEnv('PROJECT_SOURCE'),

  GENERAL_SERVICE_ENDPOINT: getOptionalProcessEnv('GENERAL_SERVICE_ENDPOINT'), // voiceflow nlu/tts services
  LUIS_SERVICE_ENDPOINT: getOptionalProcessEnv('LUIS_SERVICE_ENDPOINT'),

  // server-data-api config
  VF_DATA_ENDPOINT: getOptionalProcessEnv('VF_DATA_ENDPOINT'), // server-data-api endpoint
  ADMIN_SERVER_DATA_API_TOKEN: getOptionalProcessEnv('ADMIN_SERVER_DATA_API_TOKEN'), // Server-data-api auth token

  // creator-api config
  CREATOR_API_ENDPOINT: getOptionalProcessEnv('CREATOR_API_ENDPOINT'),
  CREATOR_API_AUTHORIZATION: getOptionalProcessEnv('CREATOR_API_AUTHORIZATION'),

  // creator-app config
  CREATOR_APP_ORIGIN: getOptionalProcessEnv('CREATOR_APP_ORIGIN'),
  DISABLE_ORIGIN_CHECK: getOptionalProcessEnv('DISABLE_ORIGIN_CHECK') === 'true',

  AWS_ACCESS_KEY_ID: getOptionalProcessEnv('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: getOptionalProcessEnv('AWS_SECRET_ACCESS_KEY'),
  AWS_REGION: getOptionalProcessEnv('AWS_REGION'),

  // Release information
  GIT_SHA: getOptionalProcessEnv('GIT_SHA'),
  BUILD_NUM: getOptionalProcessEnv('BUILD_NUM'),
  SEM_VER: getOptionalProcessEnv('SEM_VER'),
  BUILD_URL: getOptionalProcessEnv('BUILD_URL'),

  // Logging
  LOG_LEVEL: getOptionalProcessEnv('LOG_LEVEL'),
  MIDDLEWARE_VERBOSITY: getOptionalProcessEnv('MIDDLEWARE_VERBOSITY'),

  REDIS_CLUSTER_HOST: getOptionalProcessEnv('REDIS_CLUSTER_HOST'),
  REDIS_CLUSTER_PORT: Number(getOptionalProcessEnv('REDIS_CLUSTER_PORT', '6379')),

  // rate limiting
  // 1000 request per minute
  RATE_LIMITER_POINTS_PUBLIC: Number(getOptionalProcessEnv('RATE_LIMITER_POINTS_PUBLIC', '1000')),
  RATE_LIMITER_DURATION_PUBLIC: Number(getOptionalProcessEnv('RATE_LIMITER_DURATION_PUBLIC', '60')),
  // 500 requests per minute
  RATE_LIMITER_POINTS_PRIVATE: Number(getOptionalProcessEnv('RATE_LIMITER_POINTS_PRIVATE', '500')),
  RATE_LIMITER_DURATION_PRIVATE: Number(getOptionalProcessEnv('RATE_LIMITER_DURATION_PRIVATE', '60')),

  // SESSIONS SOURCE
  SESSIONS_SOURCE: getRequiredProcessEnv('SESSIONS_SOURCE'),
  MONGO_URI: getOptionalProcessEnv('MONGO_URI'),
  MONGO_DB: getOptionalProcessEnv('MONGO_DB'),

  ANALYTICS_ENDPOINT: getOptionalProcessEnv('ANALYTICS_ENDPOINT') || null,
  ANALYTICS_WRITE_KEY: getOptionalProcessEnv('ANALYTICS_WRITE_KEY') || null,

  INGEST_V2_WEBHOOK_ENDPOINT: getOptionalProcessEnv('INGEST_V2_WEBHOOK_ENDPOINT') || null,
};

export default CONFIG;
