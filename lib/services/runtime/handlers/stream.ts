import { BaseNode } from '@voiceflow/base-types';
import { replaceVariables } from '@voiceflow/common';

import { HandlerFactory } from '@/runtime';

import { StorageType, StreamAction, StreamPauseStorage, StreamPlayStorage } from '../types';
import { mapStreamActions } from './utils/stream';

const handlerUtils = {
  replaceVariables,
};

export const StreamHandler: HandlerFactory<BaseNode.Stream.Node, typeof handlerUtils> = (
  utils
) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.STREAM && !!node.src,
  handle: (node, runtime, variables) => {
    const variablesMap = variables.getState();

    const streamData = {
      src: utils.replaceVariables(node.src, variablesMap),
      loop: node.loop,
      description: utils.replaceVariables(node.description, variablesMap),
      title: utils.replaceVariables(node.title, variablesMap),
      iconImage: utils.replaceVariables(node.iconImage, variablesMap),
      backgroundImage: utils.replaceVariables(node.backgroundImage, variablesMap),
      token: node.id,
      action: StreamAction.START,
      offset: 0,
      nodeID: node.id,
      nextID: node.nextID,
      pauseID: node.pauseID,
      previousID: node.previousID,
    };

    const streamPause = runtime.storage.get<StreamPauseStorage>(StorageType.STREAM_PAUSE);

    if (streamPause) {
      if (node.id === streamPause.id) {
        streamData.offset = streamPause.offset;
        streamData.action = StreamAction.PAUSE;
      }

      runtime.storage.delete(StorageType.STREAM_PAUSE);
    }

    runtime.storage.set<StreamPlayStorage>(StorageType.STREAM_PLAY, streamData);

    runtime.end();

    const mappedAction = mapStreamActions(streamData.action);
    if (mappedAction) {
      runtime.trace.addTrace<BaseNode.Stream.TraceFrame>({
        type: BaseNode.Utils.TraceType.STREAM,
        payload: {
          src: streamData.src,
          token: streamData.token,
          action: mappedAction,
          loop: streamData.loop,
          description: streamData.description,
          title: streamData.title,
          iconImage: streamData.iconImage,
          backgroundImage: streamData.backgroundImage,
        },
      });
    }

    return null;
  },
});

export default () => StreamHandler(handlerUtils);
