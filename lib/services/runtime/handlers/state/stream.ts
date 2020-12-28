/* eslint-disable sonarjs/no-duplicate-string */
import { IntentName, NodeID } from '@voiceflow/general-types';
import { HandlerFactory, replaceVariables } from '@voiceflow/runtime';

import { Action } from '@/../runtime/build/lib/Runtime';

import { isIntentRequest, StorageData, StorageType, StreamAction, StreamPauseStorage, StreamPlayStorage } from '../../types';
import CommandHandler from '../command';

const utilsObj = {
  commandHandler: CommandHandler(),
  replaceVariables,
};

export const StreamStateHandler: HandlerFactory<any, typeof utilsObj> = (utils) => ({
  canHandle: (_, runtime) =>
    !!runtime.storage.get(StorageType.STREAM_PLAY) && runtime.storage.get<StreamPlayStorage>(StorageType.STREAM_PLAY)!.action !== StreamAction.END,
  handle: (_, runtime, variables) => {
    const streamPlay = runtime.storage.get<StreamPlayStorage>(StorageType.STREAM_PLAY)!;

    // request for this turn has been processed, set action to response
    runtime.setAction(Action.RESPONSE);
    const request = runtime.getRequest();
    const intentName = isIntentRequest(request) ? request.payload.intent.name : null;

    let nextId: NodeID = null;

    if (intentName === IntentName.PAUSE) {
      if (streamPlay.pauseID) {
        // If it is linked to something else, save current pause state
        runtime.storage.set<StreamPauseStorage>(StorageType.STREAM_PAUSE, { id: streamPlay.nodeID, offset: streamPlay.offset });

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
    } else if (intentName === IntentName.RESUME) {
      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.RESUME;
      });

      runtime.end();
    } else if (intentName === IntentName.START_OVER || intentName === IntentName.REPEAT) {
      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.START;
        draft[StorageType.STREAM_PLAY]!.offset = 0;
      });

      runtime.end();
    } else if (intentName === IntentName.NEXT || streamPlay.action === StreamAction.NEXT) {
      if (streamPlay.nextID) {
        nextId = streamPlay.nextID;
      }

      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.END;
      });
    } else if (intentName === IntentName.PREVIOUS) {
      if (streamPlay.previousID) {
        nextId = streamPlay.previousID;
      }

      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.END;
      });
    } else if (intentName === IntentName.CANCEL) {
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

      runtime.storage.produce<StorageData>((draft) => {
        draft.output += 'Sorry, this action isn’t available in this skill. ';
      });

      runtime.end();
    }

    return nextId ?? null;
  },
});

export default () => StreamStateHandler(utilsObj);
