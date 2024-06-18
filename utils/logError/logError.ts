import { LogLevel } from '@voiceflow/logger';

import log from '@/logger';

interface RaiseErrorOptions {
  shouldLog?: boolean;
  logLevel?: LogLevel;
}

export type ErrorRaiser = (message: string, options?: RaiseErrorOptions) => Error;

export const createErrorRaiser =
  (context: string): ErrorRaiser =>
  (message, options = {}) => {
    const { shouldLog = true, logLevel = LogLevel.ERROR } = options;

    const errorMessage = `[${context}]: ${message}`;

    if (shouldLog) {
      switch (logLevel) {
        // listed in order of most to least fatality
        case LogLevel.FATAL:
          log.fatal(errorMessage);
          break;
        case LogLevel.ERROR:
          log.error(errorMessage);
          break;
        case LogLevel.WARN:
          log.error(errorMessage);
          break;
        case LogLevel.INFO:
          log.info(errorMessage);
          break;
        case LogLevel.DEBUG:
          log.debug(errorMessage);
          break;
        case LogLevel.TRACE:
          log.trace(errorMessage);
          break;
        default:
          throw new Error('unknown log level recevied');
      }
    }

    return new Error(errorMessage);
  };
