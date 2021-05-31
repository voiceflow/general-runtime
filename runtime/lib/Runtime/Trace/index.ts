import { TraceFrame, TraceType } from '@voiceflow/general-types';

import { EventType } from '@/runtime/lib/Lifecycle';

import Runtime from '..';

export default class Trace {
  private trace: TraceFrame[] = [];

  constructor(private runtime: Runtime) {}

  addTrace<TF extends TraceFrame>(frame: TF) {
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

  get<TF extends TraceFrame>(): TF[] {
    return this.trace as TF[];
  }

  debug(message: string) {
    this.addTrace({ type: TraceType.DEBUG, payload: { message } });
  }
}
