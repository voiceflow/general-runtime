import { Validator } from '@voiceflow/backend-utils';
import { RuntimeLogs } from '@voiceflow/base-types';

import CONFIG from '@/config';

/** A value that can be resolved to a log level. */
type LogLevelResolvable = RuntimeLogs.LogLevel | boolean | `${boolean}` | undefined;

const isLogLevelResolvable = (value: unknown): value is LogLevelResolvable => {
  switch (value) {
    case 'true':
    case 'false':
    case true:
    case false:
    case undefined:
      return true;
    default:
      return typeof value === 'string' && RuntimeLogs.isLogLevel(value);
  }
};

const resolveLogLevel = (value: LogLevelResolvable): RuntimeLogs.LogLevel => {
  switch (value) {
    // Explicit opt out or unspecified
    case false:
    case 'false':
    case undefined:
      return RuntimeLogs.LogLevel.OFF;
    // Opt in but didn't specify a specific log level to use
    case true:
    case 'true':
      return RuntimeLogs.DEFAULT_LOG_LEVEL;
    // Opt in with a specific log level
    default:
      return value;
  }
};

const { query } = Validator;

export const QUERY = {
  LOGS: query('logs')
    .custom((value: unknown) => isLogLevelResolvable(value))
    .withMessage('must be a known log level, boolean, or undefined')
    .customSanitizer(resolveLogLevel),
};
