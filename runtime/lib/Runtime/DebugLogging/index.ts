import { BaseModels, BaseNode, RuntimeLogs } from '@voiceflow/base-types';

import Runtime from '..';
import Trace from '../Trace';
import { TraceLogBuffer } from './traceLogBuffer';
import { AddTraceFn, DEFAULT_LOG_LEVEL, getISO8601Timestamp } from './utils';

type Message<T extends RuntimeLogs.Log> = T['message'];
type RemovePrefix<Prefix extends string, T extends string> = T extends `${Prefix}${infer T}` ? T : never;

type PossibleStepLogLevel = RuntimeLogs.Logs.StepLog['level'];
type PossibleStepLogKind = RemovePrefix<'step.', RuntimeLogs.Logs.StepLog['kind']>;

type PossibleGlobalLogLevel = RuntimeLogs.Logs.GlobalLog['level'];
type PossibleGlobalLogKind = RemovePrefix<'global.', RuntimeLogs.Logs.GlobalLog['kind']>;

export default class DebugLogging {
  public static createPathReference(node: BaseModels.BaseNode): RuntimeLogs.PathReference {
    return {
      stepID: node.id,
      // The fallback here deviates from the spec but is necessary to avoid simply throwing an error when a path leads to a node that isn't mappable to a standard component name
      componentName: RuntimeLogs.Kinds.nodeTypeToStepLogKind(node.type as BaseNode.NodeType) ?? (node.type as any),
    };
  }

  private readonly logBuffer: RuntimeLogs.AsyncLogBuffer;

  /** The most verbose log level that will be be logged. */
  maxLogLevel: RuntimeLogs.LogLevel = DEFAULT_LOG_LEVEL;

  /**
   * @param runtime - The runtime to use for logging.
   */
  constructor(runtime: Runtime);

  /**
   * @param trace - The trace to use for logging.
   */
  constructor(trace: Trace);

  /**
   * @param addTraceFn - A function that will be called to add a trace to the runtime's trace array
   */
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

  /** Returns whether a runtime debug log with the provided log level should be logged using this {@link DebugLogging}'s maximum log level. */
  shouldLog(level: RuntimeLogs.LogLevel): boolean {
    return level <= this.maxLogLevel;
  }

  /**
   * Record a runtime debug log for a step at the given log level (or {@link DEFAULT_LOG_LEVEL the default log level} if not specified).
   * Nothing will be logged if the configured maximum log level is less verbose than the log level provided to this method.
   */
  recordStepLog<Kind extends PossibleStepLogKind, Level extends PossibleStepLogLevel>(
    kind: Kind,
    message: Message<Extract<RuntimeLogs.Logs.StepLog, { kind: `step.${Kind}`; level: Level }>>,
    level?: Level
  ): void {
    this.recordLog(`step.${kind}`, message, level);
  }

  /**
   * Record a runtime debug log for a global event at the given log level (or {@link DEFAULT_LOG_LEVEL the default log level} if not specified).
   * Nothing will be logged if the configured log level is less verbose than the log level provided to this method.
   */
  recordGlobalLog<Kind extends PossibleGlobalLogKind, Level extends PossibleGlobalLogLevel>(
    kind: Kind,
    message: Message<Extract<RuntimeLogs.Logs.GlobalLog, { kind: `global.${Kind}`; level: Level }>>,
    level?: Level
  ): void {
    this.recordLog(`global.${kind}`, message, level);
  }

  /** Record a log. Private method, has no typesafety to guarantee you don't record a log which doesn't conform to the spec. */
  private recordLog(kind: RuntimeLogs.Log['kind'], message: Message<RuntimeLogs.Log>, level: RuntimeLogs.LogLevel = DEFAULT_LOG_LEVEL): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const log: RuntimeLogs.Log = {
      kind: kind as any,
      message: message as any,
      level: level as any,
      timestamp: getISO8601Timestamp(),
    };

    this.logBuffer.push(log);
  }
}
