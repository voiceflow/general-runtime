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
  CODE_HANDLER_ENDPOINT: getOptionalProcessEnv('CODE_HANDLER_ENDPOINT') || 'none',
  // integrations block
  INTEGRATIONS_HANDLER_ENDPOINT: getOptionalProcessEnv('INTEGRATIONS_HANDLER_ENDPOINT') || 'none',
  // api-block
  API_HANDLER_ENDPOINT: getOptionalProcessEnv('API_HANDLER_ENDPOINT'),

  PROJECT_SOURCE: getOptionalProcessEnv('PROJECT_SOURCE'),
  SESSIONS_SOURCE: getOptionalProcessEnv('SESSIONS_SOURCE'),

  GENERAL_SERVICE_ENDPOINT: getRequiredProcessEnv('GENERAL_SERVICE_ENDPOINT'), // voiceflow nlu/tts services

  // Secrets
  DATADOG_API_KEY: getOptionalProcessEnv('DATADOG_API_KEY') || 'none',

  // server-data-api config
  VF_DATA_ENDPOINT: getOptionalProcessEnv('VF_DATA_ENDPOINT'), // server-data-api endpoint
  ADMIN_SERVER_DATA_API_TOKEN: getOptionalProcessEnv('ADMIN_SERVER_DATA_API_TOKEN'), // Server-data-api auth token

  // creator-api conifg
  CREATOR_API_ENDPOINT: getOptionalProcessEnv('CREATOR_API_ENDPOINT'),
  CREATOR_API_AUTHORIZATION: getOptionalProcessEnv('CREATOR_API_AUTHORIZATION'),

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
};

export default CONFIG;
