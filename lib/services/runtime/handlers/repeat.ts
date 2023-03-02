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

const repeatIntents = new Set<string>([
  VoiceflowConstants.IntentName.REPEAT,
  AlexaConstants.AmazonIntent.REPEAT,
  GoogleConstants.GoogleIntent.REPEAT,
]);

export const RepeatHandler = (utils: typeof utilsObj) => ({
  canHandle: (runtime: Runtime): boolean => {
    const repeat = runtime.storage.get<BaseVersion.RepeatType>(StorageType.REPEAT);
    const request = runtime.getRequest();
    return (
      isIntentRequest(request) &&
      repeatIntents.has(request.payload.intent.name) &&
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
      variables: runtime.variables,
    });

    return top.getNodeID() || null;
  },
});

export default () => RepeatHandler(utilsObj);
