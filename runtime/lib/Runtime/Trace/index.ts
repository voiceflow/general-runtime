import { BaseNode } from '@voiceflow/base-types';
import _truncate from 'lodash/truncate';

import { ContextEventType } from '@/runtime/lib/Context/types';
import { EventType } from '@/runtime/lib/Lifecycle';

import Runtime from '..';

export default class Trace {
  private trace: BaseNode.Utils.BaseTraceFrame[] = [];

  constructor(private runtime: Runtime) {}

  addTrace<TF extends BaseNode.Utils.BaseTraceFrame>(frame: TF, { eventType }: { eventType?: ContextEventType } = {}) {
    let stop = false;

    this.runtime.callEvent(EventType.traceWillAdd, {
      frame,
      stop: () => {
        stop = true;
      },
      eventType,
    });

    if (stop) return;

    this.trace = [...this.trace, frame];
  }

  get<TF extends BaseNode.Utils.BaseTraceFrame>(): TF[] {
    return this.trace as TF[];
  }

  debug(message: string, type?: BaseNode.NodeType): void {
    this.addTrace({
      type: BaseNode.Utils.TraceType.DEBUG,
      payload: { type, message: _truncate(message, { length: 500 }) },
    });
  }
}
