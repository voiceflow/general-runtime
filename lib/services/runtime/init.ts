import { Node, Trace } from '@voiceflow/base-types';
import { slate as SlateUtils } from '@voiceflow/internal';
import cuid from 'cuid';

import Client, { EventType } from '@/runtime';

import { RESUME_PROGRAM_ID, ResumeDiagram } from './programs/resume';
import { FrameType, SpeakFrame, StorageData, StorageType, StreamAction, StreamPlayStorage, TextFrame, TurnType } from './types';

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

    const output = runtime.stack.top().storage.get<TextFrame>(FrameType.TEXT) ?? runtime.stack.top().storage.get<SpeakFrame>(FrameType.SPEAK);

    if (!output) {
      return;
    }

    runtime.storage.produce<StorageData>((draft) => {
      const draftOutput = draft[StorageType.OUTPUT] || '';

      if (Array.isArray(output)) {
        draft[StorageType.OUTPUT] = [...(Array.isArray(draftOutput) ? draftOutput : [{ children: [{ text: draftOutput }] }]), ...output];
      } else {
        draft[StorageType.OUTPUT] = `${Array.isArray(draftOutput) ? SlateUtils.toPlaintext(draftOutput) : draftOutput}${output}`;
      }
    });

    if (Array.isArray(output)) {
      runtime.trace.addTrace<Trace.TextTrace>({
        type: Node.Utils.TraceType.TEXT,
        payload: { slate: { id: cuid.slug(), content: output }, message: SlateUtils.toPlaintext(output) },
      });
    } else {
      runtime.trace.addTrace<Node.Speak.TraceFrame>({
        type: Node.Utils.TraceType.SPEAK,
        payload: { message: output, type: Node.Speak.TraceSpeakType.MESSAGE },
      });
    }
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
