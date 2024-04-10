import { BaseModels, BaseNode, RuntimeLogs } from '@voiceflow/base-types';
import assert from 'assert/strict';

import { Context } from '@/types';

import { Frame } from '../Stack';
import Trace from '../Trace';
import { TraceLogBuffer } from './traceLogBuffer';
import { AddTraceFn, getISO8601Timestamp } from './utils';

type Message<T extends RuntimeLogs.Log> = T['message'];
export type SimpleStepMessage<T extends RuntimeLogs.Logs.StepLog> = Omit<
  Message<T>,
  keyof RuntimeLogs.PathReference
>;
type RemovePrefix<Prefix extends string, T extends string> = T extends `${Prefix}${infer T}`
  ? T
  : never;

type PossibleStepLogLevel = RuntimeLogs.Logs.StepLog['level'];
type PossibleStepLogKind = RemovePrefix<'step.', RuntimeLogs.Logs.StepLog['kind']>;

type PossibleGlobalLogLevel = RuntimeLogs.Logs.GlobalLog['level'];
type PossibleGlobalLogKind = RemovePrefix<'global.', RuntimeLogs.Logs.GlobalLog['kind']>;

export default class DebugLogging {
  public static createPathReference(
    node: BaseModels.BaseNode,
    kind?: RuntimeLogs.Kinds.StepLogKind
  ): RuntimeLogs.PathReference;

  public static createPathReference(
    node: undefined | null,
    kind?: RuntimeLogs.Kinds.StepLogKind
  ): Record<keyof RuntimeLogs.PathReference, null>;

  public static createPathReference(
    node: BaseModels.BaseNode | undefined | null,
    kind?: RuntimeLogs.Kinds.StepLogKind
  ): RuntimeLogs.PathReference | Record<keyof RuntimeLogs.PathReference, null> {
    if (node) {
      return {
        stepID: node.id,
        // The fallback here deviates from the spec but is necessary to avoid simply throwing an error when a path leads
        // to a node that isn't mappable to a standard component name
        componentName:
          kind ??
          RuntimeLogs.Kinds.nodeTypeToStepLogKind(node.type as BaseNode.NodeType) ??
          (node.type as any),
      };
    }

    return {
      stepID: null,
      componentName: null,
    };
  }

  public static createFlowReference(frame: Frame): RuntimeLogs.FlowReference {
    return {
      name: frame.getName() ?? null,
      diagramID: frame.getDiagramID(),
    };
  }

  private readonly logBuffer: RuntimeLogs.AsyncLogBuffer;

  /** The most verbose log level that will be be logged. */
  maxLogLevel: RuntimeLogs.LogLevel = RuntimeLogs.DEFAULT_LOG_LEVEL;

  /**
   * @param context - The context to use for logging.
   */
  constructor(context: Context);

  /**
   * @param trace - The trace to use for logging.
   */
  constructor(trace: Trace);

  /**
   * @param addTraceFn - A function that will be called to add a trace to the runtime's trace array
   */
  constructor(addTraceFn: AddTraceFn);

  constructor(addTraceResolvable: Context | Trace | AddTraceFn) {
    let addTrace: AddTraceFn;
    if (typeof addTraceResolvable === 'function') {
      const addTraceFn = addTraceResolvable;
      addTrace = addTraceFn.bind(addTraceFn);
    } else if (addTraceResolvable instanceof Trace) {
      const trace = addTraceResolvable;
      addTrace = trace.addTrace.bind(trace);
    } else {
      const context = addTraceResolvable;
      this.refreshContext(context);

      assert(
        context.trace,
        new TypeError('Provided context object did not have a trace array defined')
      );
      // @ts-expect-error The trace type that `context` uses is not necessarily compatible with the default of `Context`
      addTrace = context.trace.push.bind(context.trace);
    }

    this.logBuffer = new TraceLogBuffer(addTrace);
  }

  refreshContext(context: Pick<Context, 'maxLogLevel'>): void {
    this.maxLogLevel = context.maxLogLevel;
  }

  /**
   * Returns whether a runtime debug log with the provided log level should be logged using this {@link DebugLogging}'s
   * maximum log level.
   */
  shouldLog(level: RuntimeLogs.LogLevel): boolean {
    return (
      RuntimeLogs.getValueForLogLevel(level) <= RuntimeLogs.getValueForLogLevel(this.maxLogLevel)
    );
  }

  /**
   * Record a runtime debug log for a step at the default log level. Nothing will be logged if the configured maximum
   * log level is less verbose than the default log level.
   */
  recordStepLog<Kind extends PossibleStepLogKind>(
    kind: Kind,
    node: SimpleStepMessage<
      Extract<
        RuntimeLogs.Logs.StepLog,
        { kind: `step.${Kind}`; level: typeof RuntimeLogs.DEFAULT_LOG_LEVEL }
      >
    > extends RuntimeLogs.PathReference
      ? BaseModels.BaseNode
      : BaseModels.BaseNode | undefined,
    message: SimpleStepMessage<
      Extract<
        RuntimeLogs.Logs.StepLog,
        { kind: `step.${Kind}`; level: typeof RuntimeLogs.DEFAULT_LOG_LEVEL }
      >
    >
  ): void;

  /**
   * Record a runtime debug log for a step at the given log level.
   * Nothing will be logged if the configured maximum log level is less verbose than the log level provided to this
   * method.
   */
  recordStepLog<Kind extends PossibleStepLogKind, Level extends PossibleStepLogLevel>(
    kind: Kind,
    node: SimpleStepMessage<
      Extract<RuntimeLogs.Logs.StepLog, { kind: `step.${Kind}`; level: Level }>
    > extends RuntimeLogs.PathReference
      ? BaseModels.BaseNode
      : BaseModels.BaseNode | undefined,
    message: SimpleStepMessage<
      Extract<RuntimeLogs.Logs.StepLog, { kind: `step.${Kind}`; level: Level }>
    >,
    level: Level
  ): void;

  /**
   * Record a runtime debug log for a step at the given log level (or the default log level if no level is provided).
   * Nothing will be logged if the configured maximum log level is less verbose than the log level provided to this
   * method.
   */
  recordStepLog<Kind extends PossibleStepLogKind, Level extends PossibleStepLogLevel>(
    kind: Kind,
    node: BaseModels.BaseNode | undefined,
    message: SimpleStepMessage<
      Extract<RuntimeLogs.Logs.StepLog, { kind: `step.${Kind}`; level: Level }>
    >,
    level?: Level
  ): void {
    this.recordLog(
      `step.${kind}`,
      {
        ...message,
        // @ts-expect-error The method overloads prevent the error TS reports from ever occurring
        ...DebugLogging.createPathReference(node, kind as RuntimeLogs.Kinds.StepLogKind),
      },
      level
    );
  }

  /**
   * Record a runtime debug log for a global event at the default log level. Nothing will be logged if the configured
   * maximum log level is less verbose than the default log level.
   */
  recordGlobalLog<Kind extends PossibleGlobalLogKind>(
    kind: Kind,
    message: Message<
      Extract<
        RuntimeLogs.Logs.GlobalLog,
        { kind: `global.${Kind}`; level: typeof RuntimeLogs.DEFAULT_LOG_LEVEL }
      >
    >
  ): void;

  /**
   * Record a runtime debug log for a global event at the given log level.
   * Nothing will be logged if the configured log level is less verbose than the log level provided to this method.
   */
  recordGlobalLog<Kind extends PossibleGlobalLogKind, Level extends PossibleGlobalLogLevel>(
    kind: Kind,
    message: Message<Extract<RuntimeLogs.Logs.GlobalLog, { kind: `global.${Kind}`; level: Level }>>,
    level: Level
  ): void;

  /**
   * Record a runtime debug log for a global event at the given log level (or the default log level if not specified).
   * Nothing will be logged if the configured log level is less verbose than the log level provided to this method.
   */
  recordGlobalLog<Kind extends PossibleGlobalLogKind, Level extends PossibleGlobalLogLevel>(
    kind: Kind,
    message: Message<Extract<RuntimeLogs.Logs.GlobalLog, { kind: `global.${Kind}`; level: Level }>>,
    level?: Level
  ): void {
    this.recordLog(`global.${kind}`, message, level);
  }

  /**
   * Record a log. Private method, has no typesafety to guarantee you don't record a log which doesn't conform to the
   * spec.
   */
  private recordLog(
    kind: RuntimeLogs.Log['kind'],
    message: Message<RuntimeLogs.Log>,
    level: RuntimeLogs.LogLevel = RuntimeLogs.DEFAULT_LOG_LEVEL
  ): void {
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
