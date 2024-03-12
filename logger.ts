import { createHTTPLogger, createLogger, LogFormat, LogLevel } from '@voiceflow/logger';
import type { HttpLogger } from '@voiceflow/logger/node_modules/pino-http';
import type { Logger } from 'pino';
import util from 'util';

import config from './config';

const isDev = ['local', 'test'].includes(process.env.NODE_ENV || '');

const log: Logger<never> = createLogger({
  level: config.LOG_LEVEL as LogLevel,
  format: isDev ? LogFormat.DETAILED : LogFormat.JSON,
});

const logMiddleware = (): HttpLogger =>
  createHTTPLogger({
    level: config.LOG_LEVEL as LogLevel,
    format: isDev ? LogFormat.INLINE : LogFormat.JSON,
  });

const vars = (variables: Record<string, unknown>, prefix = '| '): string => {
  return (
    prefix +
    Object.entries(variables)
      .map(([key, value]) => {
        const serializedValue = value !== null && typeof value === 'object' ? util.inspect(value) : value;

        return `${key}=${serializedValue}`;
      })
      .join(', ')
  );
};

export default Object.assign(log, { logMiddleware, vars });
