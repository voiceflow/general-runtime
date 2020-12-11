/* eslint-disable sonarjs/no-duplicate-string */
import { IntentName, IntentRequest, NodeID } from '@voiceflow/general-types';
import { HandlerFactory, replaceVariables } from '@voiceflow/runtime';

import { StorageData, StorageType, StreamAction, StreamPauseStorage, StreamPlayStorage, TurnType } from '../../types';
import CommandHandler from '../command';

const utilsObj = {
  commandHandler: CommandHandler(),
  replaceVariables,
};

export const StreamStateHandler: HandlerFactory<any, typeof utilsObj> = (utils) => ({
  canHandle: (_, context) =>
    !!context.storage.get(StorageType.STREAM_PLAY) && context.storage.get<StreamPlayStorage>(StorageType.STREAM_PLAY)!.action !== StreamAction.END,
  handle: (_, context, variables) => {
    const request = context.turn.get<IntentRequest>(TurnType.REQUEST);
    const streamPlay = context.storage.get<StreamPlayStorage>(StorageType.STREAM_PLAY)!;

    const intentName = request?.payload?.intent?.name || null;

    let nextId: NodeID = null;

    if (intentName === IntentName.PAUSE) {
      if (streamPlay.pauseID) {
        // If it is linked to something else, save current pause state
        context.storage.set<StreamPauseStorage>(StorageType.STREAM_PAUSE, { id: streamPlay.nodeID, offset: streamPlay.offset });

        nextId = streamPlay.pauseID;

        context.storage.produce<StorageData>((draft) => {
          draft[StorageType.STREAM_PLAY]!.action = StreamAction.END;
        });
      } else {
        // Literally just PAUSE
        context.storage.produce<StorageData>((draft) => {
          draft[StorageType.STREAM_PLAY]!.action = StreamAction.PAUSE;
        });

        context.end();
      }
    } else if (intentName === IntentName.RESUME) {
      context.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.RESUME;
      });

      context.end();
    } else if (intentName === IntentName.START_OVER || intentName === IntentName.REPEAT) {
      context.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.START;
        draft[StorageType.STREAM_PLAY]!.offset = 0;
      });

      context.end();
    } else if (intentName === IntentName.NEXT || streamPlay.action === StreamAction.NEXT) {
      if (streamPlay.nextID) {
        nextId = streamPlay.nextID;
      }

      context.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.END;
      });
    } else if (intentName === IntentName.PREVIOUS) {
      if (streamPlay.previousID) {
        nextId = streamPlay.previousID;
      }

      context.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.END;
      });
    } else if (intentName === IntentName.CANCEL) {
      context.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.PAUSE;
      });

      context.end();
    } else if (utils.commandHandler.canHandle(context)) {
      context.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.END;
      });

      return utils.commandHandler.handle(context, variables);
    } else {
      context.storage.produce<StorageData>((draft) => {
        draft[StorageType.STREAM_PLAY]!.action = StreamAction.NOEFFECT;
      });

      context.storage.produce<StorageData>((draft) => {
        draft.output += 'Sorry, this action isn’t available in this skill. ';
      });

      context.end();
    }

    // request for this turn has been processed, delete request
    context.turn.delete(TurnType.REQUEST);

    return nextId ?? null;
  },
});

export default () => StreamStateHandler(utilsObj);
