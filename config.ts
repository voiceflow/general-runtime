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
  // configs
  NODE_ENV,
  PORT: getRequiredProcessEnv('PORT'),
  PORT_METRICS: getOptionalProcessEnv('PORT_METRICS'),
  ERROR_RESPONSE_MS: Number(getOptionalProcessEnv('ERROR_RESPONSE_MS', (20 * 1000).toString())),

  CLOUD_ENV,

  IS_PRIVATE_CLOUD: NODE_ENV === 'production' && CLOUD_ENV !== 'public',

  AWS_ENDPOINT: getOptionalProcessEnv('AWS_ENDPOINT'),
  DYNAMO_ENDPOINT: getOptionalProcessEnv('DYNAMO_ENDPOINT'),

  S3_ACCESS_KEY_ID: getOptionalProcessEnv('S3_ACCESS_KEY_ID'),
  S3_SECRET_ACCESS_KEY: getOptionalProcessEnv('S3_SECRET_ACCESS_KEY'),
  S3_TLS_BUCKET: getOptionalProcessEnv('S3_TLS_BUCKET'),
  S3_ENDPOINT: getOptionalProcessEnv('S3_ENDPOINT'),

  // code block
  CODE_HANDLER_ENDPOINT: getOptionalProcessEnv('CODE_HANDLER_ENDPOINT'),
  // integrations block
  INTEGRATIONS_HANDLER_ENDPOINT: getOptionalProcessEnv('INTEGRATIONS_HANDLER_ENDPOINT') || 'none',
  // api-block
  API_REQUEST_TIMEOUT_MS: Number(getOptionalProcessEnv('API_MAX_TIMEOUT_MS')) || null,
  API_MAX_CONTENT_LENGTH_BYTES: Number(getOptionalProcessEnv('API_MAX_CONTENT_LENGTH_BYTES')) || null,
  API_MAX_BODY_LENGTH_BYTES: Number(getOptionalProcessEnv('API_MAX_BODY_LENGTH_BYTES')) || null,

  PROJECT_SOURCE: getOptionalProcessEnv('PROJECT_SOURCE'),

  GENERAL_SERVICE_ENDPOINT: getOptionalProcessEnv('GENERAL_SERVICE_ENDPOINT'), // voiceflow nlu/tts services
  KNOWLEDGE_BASE_LAMBDA_ENDPOINT: getOptionalProcessEnv('KNOWLEDGE_BASE_LAMBDA_ENDPOINT'),

  KL_RETRIEVER_SERVICE_HOST: getOptionalProcessEnv('KL_RETRIEVER_SERVICE_HOST'),
  KL_RETRIEVER_SERVICE_PORT: getOptionalProcessEnv('KL_RETRIEVER_SERVICE_PORT'),

  // Feedback analytics
  ANALYTICS_API_SERVICE_HOST: getOptionalProcessEnv('ANALYTICS_API_SERVICE_HOST') || null,
  ANALYTICS_API_SERVICE_PORT_APP: getOptionalProcessEnv('ANALYTICS_API_SERVICE_PORT_APP') || null,

  AUTH_API_SERVICE_HOST: getOptionalProcessEnv('AUTH_API_SERVICE_HOST'),
  AUTH_API_SERVICE_PORT_APP: getOptionalProcessEnv('AUTH_API_SERVICE_PORT_APP'),
  NLU_GATEWAY_SERVICE_HOST: getOptionalProcessEnv('NLU_GATEWAY_SERVICE_HOST'),
  NLU_GATEWAY_SERVICE_PORT_APP: getOptionalProcessEnv('NLU_GATEWAY_SERVICE_PORT_APP'),
  BILLING_API_SERVICE_HOST: getOptionalProcessEnv('BILLING_API_SERVICE_HOST'),
  BILLING_API_SERVICE_PORT_APP: getOptionalProcessEnv('BILLING_API_SERVICE_PORT_APP'),

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

  // OpenAI
  AZURE_ENDPOINT: getOptionalProcessEnv('AZURE_ENDPOINT') || null,
  AZURE_OPENAI_API_KEY: getOptionalProcessEnv('AZURE_OPENAI_API_KEY') || null,
  AZURE_GPT3_DEPLOYMENTS: getOptionalProcessEnv('AZURE_GPT3_DEPLOYMENTS') || null,
  // eslint-disable-next-line no-secrets/no-secrets -- it thinks this is a secret for some reason
  AZURE_GPT35_DEPLOYMENTS: getOptionalProcessEnv('AZURE_GPT35_DEPLOYMENTS') || null,

  OPENAI_API_KEY: getOptionalProcessEnv('OPENAI_API_KEY') || null,

  ANTHROPIC_API_KEY: getOptionalProcessEnv('ANTHROPIC_API_KEY') || null,

  // AI Generation Settings
  AI_GENERATION_TIMEOUT: Number(getOptionalProcessEnv('AI_GENERATION_TIMEOUT')) || 30000,
};

export default CONFIG;
