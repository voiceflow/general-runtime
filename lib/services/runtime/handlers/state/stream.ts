import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseNode } from '@voiceflow/base-types';
import { replaceVariables } from '@voiceflow/common';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime';

import {
  isIntentRequest,
  StorageData,
  StorageType,
  StreamAction,
  StreamPauseStorage,
  StreamPlayStorage,
} from '../../types';
import CommandHandler from '../command';

const utilsObj = {
  commandHandler: CommandHandler(),
  replaceVariables,
};

export const StreamStateHandler: HandlerFactory<any, typeof utilsObj> = (utils) => ({
  canHandle: (_, runtime) =>
    !!runtime.storage.get(StorageType.STREAM_PLAY) &&
    runtime.storage.get<StreamPlayStorage>(StorageType.STREAM_PLAY)!.action !== StreamAction.END,
  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle: (_, runtime, variables) => {
    const streamPlay = runtime.storage.get<StreamPlayStorage>(StorageType.STREAM_PLAY)!;

    const request = runtime.getRequest();
    const intentName = isIntentRequest(request) ? request.payload.intent.name : null;

    let nextId: BaseNode.Utils.NodeID = null;

    if (intentName === VoiceflowConstants.IntentName.PAUSE || intentName === AlexaConstants.AmazonIntent.PAUSE) {
      if (streamPlay.pauseID) {
        // If it is linked to something else, save current pause state
        runtime.storage.set<StreamPauseStorage>(StorageType.STREAM_PAUSE, {
          id: streamPlay.nodeID,
          offset: streamPlay.offset,
        });

        nextId = streamPlay.pauseID;

        runtime.storage.produce<StorageData>((draft) => {
          draft[StorageType.STREAM_PLAY]!.action = StreamAction.END;
        });
      } else {
        // Literally just PAUSE
        runtime.storage.produce<StorageData>((draft) => {
          draft[StorageType.STREAM_PLAY]!.action = StreamAction.PAUSE;
        });

        runtime.end();
      }
    } else if (
      intentName === VoiceflowConstants.IntentName.RESUME ||
      intentName === AlexaConstants.AmazonIntent.RESUME
    ) {
      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.RESUME;
      });

      runtime.end();
    } else if (
      intentName === VoiceflowConstants.IntentName.START_OVER ||
      intentName === VoiceflowConstants.IntentName.REPEAT ||
      intentName === AlexaConstants.AmazonIntent.START_OVER ||
      intentName === AlexaConstants.AmazonIntent.REPEAT
    ) {
      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.START;
        draft[StorageType.STREAM_PLAY]!.offset = 0;
      });

      runtime.end();
    } else if (
      intentName === VoiceflowConstants.IntentName.NEXT ||
      intentName === AlexaConstants.AmazonIntent.NEXT ||
      streamPlay.action === StreamAction.NEXT
    ) {
      if (streamPlay.nextID) {
        nextId = streamPlay.nextID;
      }

      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.END;
      });
    } else if (
      intentName === VoiceflowConstants.IntentName.PREVIOUS ||
      intentName === AlexaConstants.AmazonIntent.PREVIOUS
    ) {
      if (streamPlay.previousID) {
        nextId = streamPlay.previousID;
      }

      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.END;
      });
    } else if (
      intentName === VoiceflowConstants.IntentName.CANCEL ||
      intentName === AlexaConstants.AmazonIntent.CANCEL
    ) {
      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.PAUSE;
      });

      runtime.end();
    } else if (utils.commandHandler.canHandle(runtime)) {
      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.END;
      });

      return utils.commandHandler.handle(runtime, variables);
    } else {
      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.NOEFFECT;
      });

      runtime.end();
    }

    return nextId ?? null;
  },
});

export default () => StreamStateHandler(utilsObj);
