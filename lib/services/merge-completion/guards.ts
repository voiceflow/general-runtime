import { BaseTrace } from '@voiceflow/base-types';

export const isCompletionStartTrace = (trace: BaseTrace.AnyTrace): trace is BaseTrace.CompletionStartTrace =>
  trace.type === BaseTrace.TraceType.COMPLETION_START;

export const isCompletionContinueTrace = (trace: BaseTrace.AnyTrace): trace is BaseTrace.CompletionContinueTrace =>
  trace.type === BaseTrace.TraceType.COMPLETION_CONTINUE;

export const isCompletionEndTrace = (trace: BaseTrace.AnyTrace): trace is BaseTrace.CompletionEndTrace =>
  trace.type === BaseTrace.TraceType.COMPLETION_END;
