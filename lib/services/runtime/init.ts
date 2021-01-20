import { BlockTrace, TraceType as GeneralTraceType, TraceType } from '@voiceflow/general-types';
import { TraceFrame as ExitTraceFrame } from '@voiceflow/general-types/build/nodes/exit';
import { TraceFrame as FlowTraceFrame } from '@voiceflow/general-types/build/nodes/flow';
import { TraceFrame as SpeakTraceFrame } from '@voiceflow/general-types/build/nodes/speak';
import { TraceFrame as StreamTraceFrame, TraceStreamAction } from '@voiceflow/general-types/build/nodes/stream';
import Client, { EventType } from '@voiceflow/runtime';

import { RESUME_PROGRAM_ID, ResumeDiagram } from './programs/resume';
import { FrameType, SpeakFrame, StorageData, StorageType, StreamAction, StreamPlayStorage, TurnType } from './types';

// initialize event behaviors for client
const init = (client: Client) => {
  client.setEvent(EventType.stackDidChange, ({ runtime }) => {
    const programID = runtime.stack.top()?.getProgramID();

    runtime.trace.addTrace<FlowTraceFrame>({
      type: TraceType.FLOW,
      payload: { diagramID: programID },
    });
  });

  client.setEvent(EventType.frameDidFinish, ({ runtime }) => {
    if (runtime.stack.top()?.storage.get(FrameType.CALLED_COMMAND)) {
      runtime.stack.top().storage.delete(FrameType.CALLED_COMMAND);

      const output = runtime.stack.top().storage.get<SpeakFrame>(FrameType.SPEAK);

      if (output) {
        runtime.storage.produce<StorageData>((draft) => {
          draft[StorageType.OUTPUT] += output;
        });

        runtime.trace.addTrace<SpeakTraceFrame>({ type: TraceType.SPEAK, payload: { message: output } });
      }
    }
  });

  client.setEvent(EventType.programWillFetch, ({ programID, override }) => {
    if (programID === RESUME_PROGRAM_ID) {
      override(ResumeDiagram);
    }
  });

  client.setEvent(EventType.handlerWillHandle, ({ runtime, node }) =>
    runtime.trace.addTrace<BlockTrace>({ type: GeneralTraceType.BLOCK, payload: { blockID: node.id } })
  );

  client.setEvent(EventType.updateDidExecute, ({ runtime }) => {
    const stream = runtime.storage.get<StreamPlayStorage>(StorageType.STREAM_PLAY);

    if (stream) {
      const { action, src, token, loop } = stream;

      switch (action) {
        case StreamAction.START:
        case StreamAction.RESUME:
          runtime.trace.addTrace<StreamTraceFrame>({
            type: TraceType.STREAM,
            payload: { src, token, action: loop ? TraceStreamAction.LOOP : TraceStreamAction.PLAY },
          });
          break;
        case StreamAction.PAUSE:
          runtime.trace.addTrace<StreamTraceFrame>({
            type: TraceType.STREAM,
            payload: { src, token, action: TraceStreamAction.PAUSE },
          });
          break;
        default:
          break;
      }
    }

    if (runtime.stack.isEmpty() && !runtime.turn.get(TurnType.END)) {
      runtime.trace.addTrace<ExitTraceFrame>({ type: GeneralTraceType.END });
    }
  });
};

export default init;
