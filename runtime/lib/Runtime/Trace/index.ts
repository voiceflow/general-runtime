import { Node } from '@voiceflow/base-types';

import { EventType } from '@/runtime/lib/Lifecycle';

import Runtime from '..';

export default class Trace {
  private trace: Node.Utils.BaseTraceFrame[] = [];

  constructor(private runtime: Runtime) {}

  addTrace<TF extends Node.Utils.BaseTraceFrame>(frame: TF) {
    let stop = false;

    this.runtime.callEvent(EventType.traceWillAdd, {
      frame,
      stop: () => {
        stop = true;
      },
    });

    if (stop) return;

    this.trace = [...this.trace, frame];
  }

  get<TF extends Node.Utils.BaseTraceFrame>(): TF[] {
    return this.trace as TF[];
  }

  debug(message: string, type?: Node.NodeType): void {
    this.addTrace({ type: Node.Utils.TraceType.DEBUG, payload: { type, message } });
  }
}
