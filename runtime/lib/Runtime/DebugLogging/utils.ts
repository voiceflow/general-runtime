import { BaseNode, RuntimeLogs, Trace } from '@voiceflow/base-types';
import { Environment } from '@voiceflow/common';

import { ContextEventType } from '@/runtime/lib/Context/types';

export const createLogTrace = (log: RuntimeLogs.Log): Trace.LogTrace => ({
  type: Trace.TraceType.LOG,
  payload: log,
});

export const getISO8601Timestamp: () => RuntimeLogs.Iso8601Timestamp =
  process.env.NODE_ENV === Environment.TEST
    ? () => {
        const date = new Date();
        // A semi-hacky way to avoid the need to mock the timers API in tests
        // Our tests run fast but sometimes a 1 millisecond difference can cause an assertion to fail
        date.setMilliseconds(0);
        return date.toISOString();
      }
    : () => new Date().toISOString();

export type AddTraceFn = (trace: BaseNode.Utils.BaseTraceFrame, options?: { eventType?: ContextEventType }) => void;
