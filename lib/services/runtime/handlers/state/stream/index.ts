import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseNode } from '@voiceflow/base-types';
import { replaceVariables } from '@voiceflow/common';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime';

import {
  isAlexaEventIntentRequest,
  isGeneralIntentRequest,
  StorageType,
  StreamAction,
  StreamPauseStorage,
  StreamPlayStorage,
} from '../../../types';
import CommandHandler from '../../command';
import { mapStreamActions } from '../../utils/stream';

export const utilsObj = {
  commandHandler: CommandHandler(),
  replaceVariables,
};

const pauseIntents = new Set<string>([VoiceflowConstants.IntentName.PAUSE, AlexaConstants.AmazonIntent.PAUSE]);
const resumeIntents = new Set<string>([VoiceflowConstants.IntentName.RESUME, AlexaConstants.AmazonIntent.RESUME]);
const startOverIntents = new Set<string>([
  VoiceflowConstants.IntentName.START_OVER,
  AlexaConstants.AmazonIntent.START_OVER,
]);
const repeatIntents = new Set<string>([VoiceflowConstants.IntentName.REPEAT, AlexaConstants.AmazonIntent.REPEAT]);
const nextIntents = new Set<string>([VoiceflowConstants.IntentName.NEXT, AlexaConstants.AmazonIntent.NEXT]);
const previousIntents = new Set<string>([VoiceflowConstants.IntentName.PREVIOUS, AlexaConstants.AmazonIntent.PREVIOUS]);
const cancelIntents = new Set<string>([VoiceflowConstants.IntentName.CANCEL, AlexaConstants.AmazonIntent.CANCEL]);

export const StreamStateHandler: HandlerFactory<any, typeof utilsObj> = (utils) => ({
  canHandle: (_, runtime) => {
    const request = runtime.getRequest();
    return (
      !isAlexaEventIntentRequest(request) &&
      !!runtime.storage.get(StorageType.STREAM_PLAY) &&
      runtime.storage.get<StreamPlayStorage>(StorageType.STREAM_PLAY)!.action !== StreamAction.END
    );
  },
  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle: (_, runtime, variables) => {
    const streamPlay = runtime.storage.get<StreamPlayStorage>(StorageType.STREAM_PLAY)!;

    const request = runtime.getRequest();
    const intentName = isGeneralIntentRequest(request) ? request.payload.intent.name : null;

    let nextId: BaseNode.Utils.NodeID = null;

    const streamData = {
      ...streamPlay,
    };

    if (utils.commandHandler.canHandle(runtime)) {
      streamData.action = StreamAction.END;
      runtime.storage.set<StreamPlayStorage>(StorageType.STREAM_PLAY, streamData);

      runtime.trace.addTrace<BaseNode.Stream.TraceFrame>({
        type: BaseNode.Utils.TraceType.STREAM,
        payload: {
          src: streamData.src,
          token: streamData.token,
          action: mapStreamActions(streamData.action)!,
          loop: streamData.loop,
          description: streamData.description,
          title: streamData.title,
          iconImage: streamData.iconImage,
          backgroundImage: streamData.backgroundImage,
        },
      });

      return utils.commandHandler.handle(runtime, variables);
    }

    if (intentName && pauseIntents.has(intentName)) {
      if (streamPlay.pauseID) {
        // If it is linked to something else, save current pause state
        runtime.storage.set<StreamPauseStorage>(StorageType.STREAM_PAUSE, {
          id: streamPlay.nodeID,
          offset: streamPlay.offset,
        });

        nextId = streamPlay.pauseID;
        streamData.action = StreamAction.END;
      } else {
        // Literally just PAUSE
        streamData.action = StreamAction.PAUSE;

        runtime.end();
      }
    } else if (intentName && resumeIntents.has(intentName)) {
      streamData.action = StreamAction.RESUME;
      runtime.end();
    } else if (intentName && (startOverIntents.has(intentName) || repeatIntents.has(intentName))) {
      streamData.action = StreamAction.START;
      streamData.offset = 0;

      runtime.end();
    } else if ((intentName && nextIntents.has(intentName)) || streamPlay.action === StreamAction.NEXT) {
      if (streamPlay.nextID) {
        nextId = streamPlay.nextID;
      }

      streamData.action = StreamAction.END;
    } else if (intentName && previousIntents.has(intentName)) {
      if (streamPlay.previousID) {
        nextId = streamPlay.previousID;
      }

      streamData.action = StreamAction.END;
    } else if (intentName && cancelIntents.has(intentName)) {
      streamData.action = StreamAction.PAUSE;
      runtime.end();
    } else if (intentName === AlexaConstants.AmazonIntent.PLAYBACK_NEARLY_FINISHED) {
      // if nearly finishing and loop, stop runtime processing, return loop action
      if (streamPlay.loop) {
        streamData.action = StreamAction.LOOP;
        runtime.end();
      } else {
        // otherwise end stream and continue to to next node if exists
        if (streamPlay.nextID) nextId = streamPlay.nextID;

        streamData.action = StreamAction.END;
      }
    } else {
      streamData.action = StreamAction.NOEFFECT;

      runtime.end();
    }

    runtime.storage.set<StreamPlayStorage>(StorageType.STREAM_PLAY, streamData);

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

    return nextId ?? null;
  },
});

export default () => StreamStateHandler(utilsObj);
