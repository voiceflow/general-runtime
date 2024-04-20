import { BaseModels, BaseNode, BaseTrace } from '@voiceflow/base-types';

import Program from '../Program';
import Runtime from '../Runtime';
import Frame from '../Runtime/Stack/Frame';
import Storage from '../Runtime/Store';

export enum EventType {
  updateWillExecute = 'updateWillExecute',
  updateDidExecute = 'updateDidExecute',
  updateDidCatch = 'updateDidCatch',
  programWillFetch = 'programWillFetch',
  programDidFetch = 'programDidFetch',
  stateWillExecute = 'stateWillExecute',
  stateDidExecute = 'stateDidExecute',
  stateDidCatch = 'stateDidCatch',
  handlerWillHandle = 'handlerWillHandle',
  handlerDidHandle = 'handlerDidHandle',
  handlerDidCatch = 'handlerDidCatch',
  stackWillChange = 'stackWillChange',
  stackDidChange = 'stackDidChange',
  frameDidFinish = 'frameDidFinish',
  storageWillUpdate = 'storageWillUpdate',
  storageDidUpdate = 'storageDidUpdate',
  turnWillUpdate = 'turnWillUpdate',
  turnDidUpdate = 'turnDidUpdate',
  variablesWillUpdate = 'variablesWillUpdate',
  variablesDidUpdate = 'variablesDidUpdate',
  traceWillAdd = 'traceWillAdd',
  timeout = 'timeout',
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface BaseEvent {}
interface BaseErrorEvent {
  error: Error;
}

interface UpdateDidCatchEvent extends BaseEvent, BaseErrorEvent {}

interface ProgramWillFetchEvent extends BaseEvent {
  versionID: string;
  diagramID: string;
  override: (_program: Program | undefined) => void;
}

interface ProgramDidFetchEvent extends BaseEvent {
  diagramID: string;
  versionID: string;
  program: Program;
}

interface HandlerWillHandleEvent extends BaseEvent {
  node: BaseModels.BaseNode;
  variables: Storage;
}

interface HandlerDidHandleEvent extends BaseEvent {
  node: BaseModels.BaseNode;
  variables: Storage;
}

interface HandlerDidCatchEvent extends BaseEvent, BaseErrorEvent {}

interface StateWillExecute extends BaseEvent {
  program: Program;
  variables: Storage;
}

interface StateDidExecute extends BaseEvent {
  program: Program;
  variables: Storage;
}

interface StateDidCatch extends BaseEvent, BaseErrorEvent {}

interface FrameDidFinishEvent extends BaseEvent {
  frame?: Frame;
}

interface TraceWillAddEvent<TF extends BaseNode.Utils.BaseTraceFrame> extends BaseEvent {
  stop: () => void;
  frame: TF;
}

interface StackWillChangeEvent extends BaseEvent {
  nextFrames: Frame[];
}

interface StackDidChangeEvent extends BaseEvent {
  prevFrames: Frame[];
}

export interface EventMap<TF extends BaseNode.Utils.BaseTraceFrame> {
  [EventType.updateWillExecute]: BaseEvent;
  [EventType.updateDidExecute]: BaseEvent;
  [EventType.updateDidCatch]: UpdateDidCatchEvent;

  [EventType.programWillFetch]: ProgramWillFetchEvent;
  [EventType.programDidFetch]: ProgramDidFetchEvent;

  [EventType.stackWillChange]: StackWillChangeEvent;
  [EventType.stackDidChange]: StackDidChangeEvent;

  [EventType.stateWillExecute]: StateWillExecute;
  [EventType.stateDidExecute]: StateDidExecute;
  [EventType.stateDidCatch]: StateDidCatch;

  [EventType.handlerWillHandle]: HandlerWillHandleEvent;
  [EventType.handlerDidHandle]: HandlerDidHandleEvent;
  [EventType.handlerDidCatch]: HandlerDidCatchEvent;
  [EventType.frameDidFinish]: FrameDidFinishEvent;

  [EventType.storageWillUpdate]: BaseEvent;
  [EventType.storageDidUpdate]: BaseEvent;

  [EventType.turnWillUpdate]: BaseEvent;
  [EventType.turnDidUpdate]: BaseEvent;

  [EventType.variablesWillUpdate]: BaseEvent;
  [EventType.variablesDidUpdate]: BaseEvent;

  [EventType.traceWillAdd]: TraceWillAddEvent<TF | BaseTrace.DebugTrace>;

  [EventType.timeout]: BaseEvent;
}

export type Event<
  K extends EventType,
  TF extends BaseNode.Utils.BaseTraceFrame = BaseNode.Utils.BaseTraceFrame
> = EventMap<TF>[K];
export type CallbackEvent<
  K extends EventType,
  TF extends BaseNode.Utils.BaseTraceFrame = BaseNode.Utils.BaseTraceFrame
> = Event<K, TF> & {
  runtime: Runtime;
};
export type EventCallback<
  K extends EventType,
  TF extends BaseNode.Utils.BaseTraceFrame = BaseNode.Utils.BaseTraceFrame
> = (event: CallbackEvent<K, TF>) => void | Promise<void>;
export type EventCallbackMap<TF extends BaseNode.Utils.BaseTraceFrame = BaseNode.Utils.BaseTraceFrame> = {
  [key in EventType]: EventCallback<key, TF>;
};
