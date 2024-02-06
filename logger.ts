import { createHTTPLogger, createLogger, LogFormat, LogLevel } from '@voiceflow/logger';

import config from './config';

export const log = createLogger({
  format: LogFormat.INLINE,
  level: config.LOG_LEVEL as LogLevel,
});

export const createLogMiddleware = (): ReturnType<typeof createHTTPLogger> =>
  createHTTPLogger({
    format: LogFormat.INLINE,
    level: config.LOG_LEVEL as LogLevel,
  });

export default log;
