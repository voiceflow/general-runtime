/**
 * [[include:env.md]]
 * @packageDocumentation
 */

import './envSetup';

import { getOptionalProcessEnv, getRequiredProcessEnv } from '@voiceflow/common';

import { Config } from './types';

const CONFIG: Config = {
  // Configs
  NODE_ENV: getRequiredProcessEnv('NODE_ENV'),
  PORT: getRequiredProcessEnv('PORT'),

  AWS_ENDPOINT: getOptionalProcessEnv('AWS_ENDPOINT'),
  DYNAMO_ENDPOINT: getOptionalProcessEnv('DYNAMO_ENDPOINT'),

  // code block
  CODE_HANDLER_ENDPOINT: getOptionalProcessEnv('CODE_HANDLER_ENDPOINT'),
  // integrations block
  INTEGRATIONS_HANDLER_ENDPOINT: getOptionalProcessEnv('INTEGRATIONS_HANDLER_ENDPOINT') || 'none',
  // api-block
  API_HANDLER_ENDPOINT: getOptionalProcessEnv('API_HANDLER_ENDPOINT'),

  PROJECT_SOURCE: getOptionalProcessEnv('PROJECT_SOURCE'),

  GENERAL_SERVICE_ENDPOINT: getRequiredProcessEnv('GENERAL_SERVICE_ENDPOINT'), // voiceflow nlu/tts services

  // Secrets
  DATADOG_API_KEY: getOptionalProcessEnv('DATADOG_API_KEY') || 'none',

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
  REDIS_CLUSTER_PORT: getOptionalProcessEnv('REDIS_CLUSTER_PORT'),

  // rate limiting
  // 1000 request per minute
  RATE_LIMITER_POINTS_PUBLIC: Number(getOptionalProcessEnv('RATE_LIMITER_POINTS_PUBLIC', '1000')),
  RATE_LIMITER_DURATION_PUBLIC: Number(getOptionalProcessEnv('RATE_LIMITER_DURATION_PUBLIC', '60')),
  // 500 requests per minute
  RATE_LIMITER_POINTS_PRIVATE: Number(getOptionalProcessEnv('RATE_LIMITER_POINTS_PRIVATE', '500')),
  RATE_LIMITER_DURATION_PRIVATE: Number(getOptionalProcessEnv('RATE_LIMITER_DURATION_PRIVATE', '60')),

  // SESSIONS SOURCE
  SESSIONS_SOURCE: getOptionalProcessEnv('SESSIONS_SOURCE'),
  MONGO_URI: getOptionalProcessEnv('MONGO_URI'),
  MONGO_DB: getOptionalProcessEnv('MONGO_DB'),
};

export default CONFIG;
