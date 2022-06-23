import { BaseNode } from '@voiceflow/base-types';
import { replaceVariables } from '@voiceflow/common';

import { HandlerFactory } from '@/runtime';

import { StorageData, StorageType, StreamAction, StreamPauseStorage, StreamPlayStorage } from '../types';

const handlerUtils = {
  replaceVariables,
};

export const StreamHandler: HandlerFactory<BaseNode.Stream.Node, typeof handlerUtils> = (u) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.STREAM && !!node.src,
  handle: (node, runtime, variables) => {
    const variablesMap = variables.getState();

    runtime.storage.set<StreamPlayStorage>(StorageType.STREAM_PLAY, {
      src: u.replaceVariables(node.src, variablesMap),
      loop: node.loop,
      description: node.description,
      title: node.title,
      iconImage: node.iconImage,
      backgroundImage: node.backgroundImage,
      token: node.id,
      action: StreamAction.START,
      offset: 0,
      nodeID: node.id,
      nextID: node.nextID,
      pauseID: node.pauseID,
      previousID: node.previousID,
    });

    const streamPause = runtime.storage.get<StreamPauseStorage>(StorageType.STREAM_PAUSE);

    if (streamPause) {
      if (node.id === streamPause.id) {
        runtime.storage.produce<StorageData>((draft) => {
          draft[StorageType.STREAM_PLAY]!.offset = streamPause.offset;
          draft[StorageType.STREAM_PLAY]!.action = StreamAction.PAUSE;
        });
      }

      runtime.storage.delete(StorageType.STREAM_PAUSE);
    }

    runtime.end();

    return null;
  },
});

export default () => StreamHandler(handlerUtils);
