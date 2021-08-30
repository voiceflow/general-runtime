/* eslint-disable sonarjs/no-duplicate-string */
import { Node } from '@voiceflow/base-types';
import { replaceVariables } from '@voiceflow/common';
import { Constants } from '@voiceflow/general-types';

import { Action, HandlerFactory } from '@/runtime';

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

    let nextId: Node.Utils.NodeID = null;

    if (intentName === Constants.IntentName.PAUSE) {
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
    } else if (intentName === Constants.IntentName.RESUME) {
      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.RESUME;
      });

      runtime.end();
    } else if (intentName === Constants.IntentName.START_OVER || intentName === Constants.IntentName.REPEAT) {
      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.START;
        draft[StorageType.STREAM_PLAY]!.offset = 0;
      });

      runtime.end();
    } else if (intentName === Constants.IntentName.NEXT || streamPlay.action === StreamAction.NEXT) {
      if (streamPlay.nextID) {
        nextId = streamPlay.nextID;
      }

      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.END;
      });
    } else if (intentName === Constants.IntentName.PREVIOUS) {
      if (streamPlay.previousID) {
        nextId = streamPlay.previousID;
      }

      runtime.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.END;
      });
    } else if (intentName === Constants.IntentName.CANCEL) {
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
        const draftOutput = draft[StorageType.OUTPUT] || '';

        if (Array.isArray(draftOutput)) {
          draft[StorageType.OUTPUT] = [...draftOutput, { children: [{ text: 'Sorry, this action isn’t available in this skill. ' }] }];
        } else {
          draft[StorageType.OUTPUT] = `${draftOutput}Sorry, this action isn’t available in this skill. `;
        }
      });

      runtime.end();
    }

    return nextId ?? null;
  },
});

export default () => StreamStateHandler(utilsObj);
