import { LogLevel } from '@voiceflow/logger';

import log from '@/logger';

interface RaiseErrorOptions {
  shouldLog?: boolean;
  logLevel?: LogLevel;
}

// listed in order of most to least fatality
const levelToLog = {
  [LogLevel.FATAL]: log.fatal,
  [LogLevel.ERROR]: log.error,
  [LogLevel.WARN]: log.error,
  [LogLevel.INFO]: log.info,
  [LogLevel.DEBUG]: log.debug,
  [LogLevel.TRACE]: log.trace,
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
