import { RuntimeLogs } from '@voiceflow/base-types';

import Runtime from '..';
import Trace from '../Trace';
import { TraceLogBuffer } from './traceLogBuffer';
import { AddTraceFn, getISO8601Timestamp } from './utils';

type Message<T extends RuntimeLogs.Log> = T['message'];
type RemovePrefix<Prefix extends string, T extends string> = T extends `${Prefix}${infer T}` ? T : never;

const DEFAULT_LOG_LEVEL = RuntimeLogs.LogLevel.INFO;

type PossibleStepLogLevel = RuntimeLogs.Logs.StepLog['level'];
type PossibleStepLogKind = RemovePrefix<'step.', RuntimeLogs.Logs.StepLog['kind']>;

type PossibleGlobalLogLevel = RuntimeLogs.Logs.GlobalLog['level'];
type PossibleGlobalLogKind = RemovePrefix<'global.', RuntimeLogs.Logs.GlobalLog['kind']>;

export default class DebugLogging {
  private readonly logBuffer: RuntimeLogs.AsyncLogBuffer;

  constructor(runtime: Runtime);

  constructor(trace: Trace);

  constructor(addTraceFn: AddTraceFn);

  constructor(addTraceResolvable: Runtime | Trace | AddTraceFn) {
    let addTrace: AddTraceFn;
    if (addTraceResolvable instanceof Runtime) {
      const runtime = addTraceResolvable;
      addTrace = runtime.trace.addTrace.bind(runtime.trace);
    } else if (addTraceResolvable instanceof Trace) {
      const trace = addTraceResolvable;
      addTrace = trace.addTrace.bind(trace);
    } else {
      const addTraceFn = addTraceResolvable;
      addTrace = addTraceFn.bind(addTraceFn);
    }

    this.logBuffer = new TraceLogBuffer(addTrace);
  }

  /** Record a runtime debug log for a step at the given log level (or {@link DEFAULT_LOG_LEVEL the default log level} if not specified). */
  recordStepLog<Kind extends PossibleStepLogKind, Level extends PossibleStepLogLevel>(
    kind: Kind,
    message: Message<Extract<RuntimeLogs.Logs.StepLog, { kind: `step.${Kind}`; level: Level }>>,
    level?: Level
  ): void {
    const log: RuntimeLogs.Logs.StepLog = {
      kind: `step.${kind}` as any,
      message,
      level: (level ?? DEFAULT_LOG_LEVEL) as any,
      timestamp: getISO8601Timestamp(),
    };

    this.logBuffer.push(log);
  }

  /** Record a runtime debug log for a global event at the given log level (or {@link DEFAULT_LOG_LEVEL the default log level} if not specified). */
  recordGlobalLog<Kind extends PossibleGlobalLogKind, Level extends PossibleGlobalLogLevel>(
    kind: Kind,
    message: Message<Extract<RuntimeLogs.Logs.GlobalLog, { kind: `global.${Kind}`; level: Level }>>,
    level?: Level
  ): void {
    const log: RuntimeLogs.Logs.GlobalLog = {
      kind: `global.${kind}`,
      message,
      level: level ?? DEFAULT_LOG_LEVEL,
      timestamp: getISO8601Timestamp(),
    };

    this.logBuffer.push(log);
  }
}
