import { BaseNode, RuntimeLogs, Trace } from '@voiceflow/base-types';

export const createLogTrace = (log: RuntimeLogs.Log): Trace.LogTrace => ({
  type: Trace.TraceType.LOG,
  payload: log,
});

export const getISO8601Timestamp = (): RuntimeLogs.Iso8601Timestamp => new Date().toISOString();

export type AddTraceFn = (trace: BaseNode.Utils.BaseTraceFrame) => void;
