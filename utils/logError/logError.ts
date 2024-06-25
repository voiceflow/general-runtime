import { LogLevel } from '@voiceflow/logger';

import log from '@/logger';

interface RaiseErrorOptions {
  shouldLog?: boolean;
  logLevel?: LogLevel;
}

// listed in order of most to least fatality
const levelToLog = {
  [LogLevel.FATAL]: (message: string) => log.fatal(message),
  [LogLevel.ERROR]: (message: string) => log.error(message),
  [LogLevel.WARN]: (message: string) => log.error(message),
  [LogLevel.INFO]: (message: string) => log.info(message),
  [LogLevel.DEBUG]: (message: string) => log.debug(message),
  [LogLevel.TRACE]: (message: string) => log.trace(message),
};

export type ErrorRaiser = (message: string, options?: RaiseErrorOptions) => Error;

export const createErrorRaiser =
  (context: string): ErrorRaiser =>
  (message, options = {}) => {
    const { shouldLog = true, logLevel = LogLevel.ERROR } = options;

    const errorMessage = `[${context}]: ${message}`;

    if (shouldLog) {
      if (!(logLevel in levelToLog)) {
        throw new Error('unknown log level received');
      }
      levelToLog[logLevel](errorMessage);
    }

    return new Error(errorMessage);
  };
