import { BaseNode, BaseTrace, BaseUtils } from '@voiceflow/base-types';

import Client, { EventType } from '@/runtime';

import { FrameType, Output, StorageType, StreamAction, StreamPlayStorage, TurnType } from './types';
import { outputTrace } from './utils';

// initialize event behaviors for client
const init = (client: Client) => {
  client.setEvent(EventType.stackDidChange, ({ runtime }) => {
    const top = runtime.stack.top();

    if (!top || top.getProgramID() === runtime.getVersionID()) {
      return;
    }
    runtime.trace.addTrace<BaseNode.Flow.TraceFrame>({
      type: BaseNode.Utils.TraceType.FLOW,
      payload: { diagramID: top.getProgramID(), name: top.getName() },
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

  client.setEvent(EventType.handlerWillHandle, ({ runtime, node }) => {
    // runtime only nodes don't have associated node on the FE
    if (BaseUtils.nodeType.isRuntimeOnly(node.type)) return;
    runtime.trace.addTrace<BaseTrace.BlockTrace>({
      type: BaseNode.Utils.TraceType.BLOCK,
      payload: { blockID: node.id },
    });
  });

  client.setEvent(EventType.updateDidExecute, ({ runtime }) => {
    const stream = runtime.storage.get<StreamPlayStorage>(StorageType.STREAM_PLAY);

    if (stream) {
      const { action, src, token, loop, description, title, iconImage, backgroundImage } = stream;

      switch (action) {
        case StreamAction.START:
        case StreamAction.RESUME:
          runtime.trace.addTrace<BaseNode.Stream.TraceFrame>({
            type: BaseNode.Utils.TraceType.STREAM,
            payload: {
              src,
              token,
              action: loop ? BaseNode.Stream.TraceStreamAction.LOOP : BaseNode.Stream.TraceStreamAction.PLAY,
              loop,
              description,
              title,
              iconImage,
              backgroundImage,
            },
          });
          break;
        case StreamAction.PAUSE:
          runtime.trace.addTrace<BaseNode.Stream.TraceFrame>({
            type: BaseNode.Utils.TraceType.STREAM,
            payload: {
              src,
              token,
              action: BaseNode.Stream.TraceStreamAction.PAUSE,
              loop,
              description,
              title,
              iconImage,
              backgroundImage,
            },
          });
          break;
        default:
          break;
      }
    }

    if (runtime.stack.isEmpty() && !runtime.turn.get(TurnType.END)) {
      runtime.trace.addTrace<BaseNode.Exit.TraceFrame>({ type: BaseNode.Utils.TraceType.END, payload: undefined });
    }
  });
};

export default init;
