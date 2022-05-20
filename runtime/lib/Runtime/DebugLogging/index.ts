import { RuntimeLogs } from '@/../libs/packages/base-types/build/common';

import Runtime from '..';
import Trace from '../Trace';
import { TraceLogBuffer } from './traceLogBuffer';
import { AddTraceFn, getISO8601Timestamp } from './utils';

type Message<T extends RuntimeLogs.Log> = T['message'];

const DEFAULT_LOG_LEVEL = RuntimeLogs.LogLevel.INFO;
type DefaultLogLevel = typeof DEFAULT_LOG_LEVEL;

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

  /** Record a runtime debug log for a step at {@link DEFAULT_LOG_LEVEL the default log level}. */
  recordStepLog<Kind extends RuntimeLogs.Kinds.StepLogKind>(
    kind: Kind,
    message: Message<Extract<RuntimeLogs.Logs.StepLog, { kind: `step.${Kind}`; level: DefaultLogLevel }>>
  ): void;

  /** Record a runtime debug log for a step at the given log level. */
  recordStepLog<Kind extends RuntimeLogs.Kinds.StepLogKind, Level extends RuntimeLogs.LogLevel>(
    kind: Kind,
    message: Message<Extract<RuntimeLogs.Logs.StepLog, { kind: `step.${Kind}`; level: Level }>>,
    level: Level
  ): void;

  recordStepLog<Kind extends RuntimeLogs.Kinds.StepLogKind, Level extends RuntimeLogs.LogLevel>(
    kind: Kind,
    message: Message<Extract<RuntimeLogs.Logs.StepLog, { kind: `step.${Kind}`; level: Level }>>,
    // @ts-expect-error TS is technically correct here, but the overloads ensure that the default log level value actually corresponds to the log levels at runtime
    level: Level = RuntimeLogs.LogLevel.INFO
  ): void {
    const log: RuntimeLogs.Logs.StepLog = {
      kind: `step.${kind}` as any,
      message: message as any,
      level: level as any,
      timestamp: getISO8601Timestamp(),
    };

    this.logBuffer.push(log);
  }

  /** Record a runtime debug log for a global event at {@link DEFAULT_LOG_LEVEL the default log level}. */
  recordGlobalLog<Kind extends RuntimeLogs.Kinds.GlobalLogKind>(
    kind: Kind,
    message: Message<Extract<RuntimeLogs.Logs.GlobalLog, { kind: `global.${Kind}`; level: DefaultLogLevel }>>
  ): void;

  /** Record a runtime debug log for a global event at the given log level. */
  recordGlobalLog<Kind extends RuntimeLogs.Kinds.GlobalLogKind, Level extends RuntimeLogs.LogLevel>(
    kind: Kind,
    message: Message<Extract<RuntimeLogs.Logs.GlobalLog, { kind: `global.${Kind}`; level: Level }>>,
    level: Level
  ): void;

  recordGlobalLog<Kind extends RuntimeLogs.Kinds.GlobalLogKind, Level extends RuntimeLogs.LogLevel>(
    kind: Kind,
    message: Message<Extract<RuntimeLogs.Logs.GlobalLog, { kind: `global.${Kind}`; level: Level }>>,
    // @ts-expect-error TS is technically correct here, but the overloads ensure that the default log level value actually corresponds to the log levels at runtime
    level: Level = RuntimeLogs.LogLevel.INFO
  ): void {
    const log: RuntimeLogs.Logs.GlobalLog = {
      kind: `global.${kind}` as any,
      message: message as any,
      level: level as any,
      timestamp: getISO8601Timestamp(),
    };

    this.logBuffer.push(log);
  }
}
