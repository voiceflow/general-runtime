import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseVersion } from '@voiceflow/base-types';
import { GoogleConstants } from '@voiceflow/google-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { Runtime } from '@/runtime';

import { FrameType, isIntentRequest, Output, StorageType, TurnType } from '../types';
import { outputTrace } from '../utils';

const utilsObj = {
  outputTrace,
};

export const RepeatHandler = (utils: typeof utilsObj) => ({
  canHandle: (runtime: Runtime): boolean => {
    const repeat = runtime.storage.get<BaseVersion.RepeatType>(StorageType.REPEAT);
    const request = runtime.getRequest();
    return (
      isIntentRequest(request) &&
      (request.payload.intent.name === VoiceflowConstants.IntentName.REPEAT ||
        request.payload.intent.name === AlexaConstants.AmazonIntent.REPEAT ||
        request.payload.intent.name === GoogleConstants.GoogleIntent.REPEAT) &&
      !!repeat &&
      [BaseVersion.RepeatType.ALL, BaseVersion.RepeatType.DIALOG].includes(repeat)
    );
  },
  handle: (runtime: Runtime) => {
    const repeat = runtime.storage.get<BaseVersion.RepeatType>(StorageType.REPEAT);
    const top = runtime.stack.top();

    const output =
      repeat === BaseVersion.RepeatType.ALL
        ? runtime.turn.get<Output>(TurnType.PREVIOUS_OUTPUT)
        : top.storage.get<Output>(FrameType.OUTPUT);

    utils.outputTrace({
      output,
      addTrace: runtime.trace.addTrace.bind(runtime.trace),
      debugLogging: runtime.debugLogging,
    });

    return top.getNodeID() || null;
  },
});

export default () => RepeatHandler(utilsObj);
