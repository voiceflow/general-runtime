import { BaseTrace } from '@voiceflow/base-types';

import { Trace } from '../../runtime-command/trace-command/trace/trace.dto';
import { TraceType } from '../../runtime-command/trace-command/trace/trace-type.enum';

export function adaptTrace(inTrace: Trace): BaseTrace.BaseTraceFrame {
  switch (inTrace.type) {
    case TraceType.TEXT:
      return {
        type: BaseTrace.TraceType.TEXT,
        payload: {
          message: inTrace.payload.message,
        },
      };
    case TraceType.DEBUG:
      return {
        type: BaseTrace.TraceType.DEBUG,
        payload: {
          message: inTrace.payload.message,
        },
      };
    default:
      throw new Error('function code received an unexpected trace type');
  }
}
