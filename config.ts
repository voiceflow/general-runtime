import './envSetup';

import * as Common from '@voiceflow/common';

import { Config } from './types';

const { getProcessEnv, hasProcessEnv } = Common.utils.general;

const optionalProcessEnv = (name: string) => (hasProcessEnv(name) ? getProcessEnv(name) : null);

const CONFIG: Config = {
  // Configs
  NODE_ENV: getProcessEnv('NODE_ENV'),
  PORT: getProcessEnv('PORT'),

  AWS_ENDPOINT: optionalProcessEnv('AWS_ENDPOINT'),
  DYNAMO_ENDPOINT: optionalProcessEnv('DYNAMO_ENDPOINT'),

  // code block
  CODE_HANDLER_ENDPOINT: getProcessEnv('CODE_HANDLER_ENDPOINT'),
  // integrations block
  INTEGRATIONS_HANDLER_ENDPOINT: getProcessEnv('INTEGRATIONS_HANDLER_ENDPOINT'),
  // api-block
  API_HANDLER_ENDPOINT: getProcessEnv('API_HANDLER_ENDPOINT'),

  PROJECT_SOURCE: optionalProcessEnv('PROJECT_SOURCE'),
  SESSIONS_SOURCE: optionalProcessEnv('SESSIONS_SOURCE'),
  SESSIONS_DYNAMO_TABLE: getProcessEnv('SESSIONS_DYNAMO_TABLE'), // diagrams table

  GENERAL_SERVICE_ENDPOINT: getProcessEnv('GENERAL_SERVICE_ENDPOINT'), // voiceflow nlu/tts services

  // Secrets
  DATADOG_API_KEY: getProcessEnv('DATADOG_API_KEY'),

  // server-data-api config
  VF_DATA_ENDPOINT: optionalProcessEnv('VF_DATA_ENDPOINT'), // server-data-api endpoint
  ADMIN_SERVER_DATA_API_TOKEN: optionalProcessEnv('ADMIN_SERVER_DATA_API_TOKEN'), // Server-data-api auth token

  // creator-api conifg
  CREATOR_API_ENDPOINT: optionalProcessEnv('CREATOR_API_ENDPOINT'),
  CREATOR_API_AUTHORIZATION: optionalProcessEnv('CREATOR_API_AUTHORIZATION'),

  AWS_ACCESS_KEY_ID: optionalProcessEnv('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: optionalProcessEnv('AWS_SECRET_ACCESS_KEY'),
  AWS_REGION: optionalProcessEnv('AWS_REGION'),

  // Release information
  GIT_SHA: optionalProcessEnv('GIT_SHA'),
  BUILD_NUM: optionalProcessEnv('BUILD_NUM'),
  SEM_VER: optionalProcessEnv('SEM_VER'),
  BUILD_URL: optionalProcessEnv('BUILD_URL'),

  // Logging
  LOG_LEVEL: optionalProcessEnv('LOG_LEVEL'),
  MIDDLEWARE_VERBOSITY: optionalProcessEnv('MIDDLEWARE_VERBOSITY'),
};

export default CONFIG;
