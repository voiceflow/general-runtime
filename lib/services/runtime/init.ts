import { Node, Trace } from '@voiceflow/base-types';

import Client, { EventType } from '@/runtime';

import { RESUME_PROGRAM_ID, ResumeDiagram } from './programs/resume';
import { FrameType, Output, StorageType, StreamAction, StreamPlayStorage, TurnType } from './types';
import { outputTrace } from './utils';

// initialize event behaviors for client
const init = (client: Client) => {
  client.setEvent(EventType.stackDidChange, ({ runtime }) => {
    const top = runtime.stack.top();

    runtime.trace.addTrace<Node.Flow.TraceFrame>({
      type: Node.Utils.TraceType.FLOW,
      payload: { diagramID: top?.getProgramID(), name: top?.getName() },
    });
  });

  client.setEvent(EventType.frameDidFinish, ({ runtime }) => {
    if (!runtime.stack.top()?.storage.get(FrameType.CALLED_COMMAND)) {
      return;
    }

    runtime.stack.top().storage.delete(FrameType.CALLED_COMMAND);

    const output = runtime.stack.top().storage.get<Output>(FrameType.OUTPUT);

    if (!output) {
      return;
    }

    runtime.trace.addTrace(outputTrace({ output }));
  });

  client.setEvent(EventType.programWillFetch, ({ programID, override }) => {
    if (programID === RESUME_PROGRAM_ID) {
      override(ResumeDiagram);
    }
  });

  client.setEvent(EventType.handlerWillHandle, ({ runtime, node }) =>
    runtime.trace.addTrace<Trace.BlockTrace>({ type: Node.Utils.TraceType.BLOCK, payload: { blockID: node.id } })
  );

  client.setEvent(EventType.updateDidExecute, ({ runtime }) => {
    const stream = runtime.storage.get<StreamPlayStorage>(StorageType.STREAM_PLAY);

    if (stream) {
      const { action, src, token, loop } = stream;

      switch (action) {
        case StreamAction.START:
        case StreamAction.RESUME:
          runtime.trace.addTrace<Node.Stream.TraceFrame>({
            type: Node.Utils.TraceType.STREAM,
            payload: { src, token, action: loop ? Node.Stream.TraceStreamAction.LOOP : Node.Stream.TraceStreamAction.PLAY },
          });
          break;
        case StreamAction.PAUSE:
          runtime.trace.addTrace<Node.Stream.TraceFrame>({
            type: Node.Utils.TraceType.STREAM,
            payload: { src, token, action: Node.Stream.TraceStreamAction.PAUSE },
          });
          break;
        default:
          break;
      }
    }

    if (runtime.stack.isEmpty() && !runtime.turn.get(TurnType.END)) {
      runtime.trace.addTrace<Node.Exit.TraceFrame>({ type: Node.Utils.TraceType.END, payload: undefined });
    }
  });
};

export default init;
