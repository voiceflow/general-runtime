import { BaseNode, RuntimeLogs, Trace } from '@voiceflow/base-types';

export const DEFAULT_LOG_LEVEL = RuntimeLogs.LogLevel.INFO;

export const createLogTrace = (log: RuntimeLogs.Log): Trace.LogTrace => ({
  type: Trace.TraceType.LOG,
  payload: log,
});

export const getISO8601Timestamp = (): RuntimeLogs.Iso8601Timestamp => new Date().toISOString();

export type AddTraceFn = (trace: BaseNode.Utils.BaseTraceFrame) => void;

/** A value that can be resolved to a log level. */
export type LogLevelResolvable = RuntimeLogs.LogLevel | boolean | `${boolean}` | undefined;

export const isLogLevelResolvable = (value: unknown): value is LogLevelResolvable => {
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

export const resolveLogLevel = (value: LogLevelResolvable): RuntimeLogs.LogLevel => {
  switch (value) {
    // Explicit opt out or unspecified
    case false:
    case 'false':
    case undefined:
      return RuntimeLogs.LogLevel.OFF;
    // Opt in but didn't specify a specific log level to use
    case true:
    case 'true':
      return DEFAULT_LOG_LEVEL;
    // Opt in with a specific log level
    default:
      return value;
  }
};
