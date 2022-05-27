import { RuntimeLogs } from '@voiceflow/base-types';

import { AddTraceFn, createLogTrace } from './utils';

/**
 * This class implements {@link RuntimeLogs.LogBuffer} by using the {@link Runtime.trace runtime's trace array} as the underlying buffer.
 * This means that calling {@link push()} will immediately add the provided logs to the trace without any need to {@link flush()} them.
 */
export class TraceLogBuffer implements RuntimeLogs.LogBuffer {
  readonly bufferSize = 0;

  private readonly addTrace: AddTraceFn;

  /**
   * @param addTraceFn - A function that will be called to add a trace to the runtime's trace array
   */
  constructor(addTraceFn: AddTraceFn) {
    this.addTrace = addTraceFn.bind(addTraceFn);
  }

  clear(): void {
    throw new Error('Do not call this method, there is no internal buffer to clear');
  }

  flush(): void {
    throw new Error('Do not call this method, there are never any logs to flush');
  }

  push(...logs: readonly RuntimeLogs.Log[]): void {
    logs.map((log) => createLogTrace(log)).forEach((trace) => this.addTrace(trace));
  }
}
