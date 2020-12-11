import { NodeType } from '@voiceflow/general-types';
import { Node } from '@voiceflow/general-types/build/nodes/stream';
import { HandlerFactory, replaceVariables } from '@voiceflow/runtime';

import { StorageData, StorageType, StreamAction, StreamPauseStorage, StreamPlayStorage } from '../types';

const handlerUtils = {
  replaceVariables,
};

export const StreamHandler: HandlerFactory<Node, typeof handlerUtils> = (u) => ({
  canHandle: (node) => node.type === NodeType.STREAM && !!node.src,
  handle: (node, context, variables) => {
    const variablesMap = variables.getState();

    context.storage.set<StreamPlayStorage>(StorageType.STREAM_PLAY, {
      src: u.replaceVariables(node.src, variablesMap),
      loop: node.loop,
      token: node.id,
      action: StreamAction.START,
      offset: 0,
      nodeID: node.id,
      nextID: node.nextID,
      pauseID: node.pauseID,
      previousID: node.previousID,
    });

    const streamPause = context.storage.get<StreamPauseStorage>(StorageType.STREAM_PAUSE);

    if (streamPause) {
      if (node.id === streamPause.id) {
        context.storage.produce<StorageData>((draft) => {
          draft[StorageType.STREAM_PLAY]!.offset = streamPause.offset;
          draft[StorageType.STREAM_PLAY]!.action = StreamAction.PAUSE;
        });
      }

      context.storage.delete(StorageType.STREAM_PAUSE);
    }

    context.end();

    return null;
  },
});

export default () => StreamHandler(handlerUtils);
