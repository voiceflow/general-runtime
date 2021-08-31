import { Version } from '@voiceflow/base-types';
import { Constants } from '@voiceflow/general-types';

import { Runtime } from '@/runtime';

import { FrameType, isIntentRequest, Output, StorageType, TurnType } from '../types';
import { outputTrace } from '../utils';

const utilsObj = {
  outputTrace,
};

export const RepeatHandler = (utils: typeof utilsObj) => ({
  canHandle: (runtime: Runtime): boolean => {
    const repeat = runtime.storage.get<Version.RepeatType>(StorageType.REPEAT);
    const request = runtime.getRequest();
    return (
      isIntentRequest(request) &&
      request.payload.intent.name === Constants.IntentName.REPEAT &&
      !!repeat &&
      [Version.RepeatType.ALL, Version.RepeatType.DIALOG].includes(repeat)
    );
  },
  handle: (runtime: Runtime) => {
    const repeat = runtime.storage.get<Version.RepeatType>(StorageType.REPEAT);
    const top = runtime.stack.top();

    const output = repeat === Version.RepeatType.ALL ? runtime.turn.get<Output>(TurnType.PREVIOUS_OUTPUT) : top.storage.get<Output>(FrameType.OUTPUT);

    runtime.trace.addTrace(utils.outputTrace({ output }));

    return top.getNodeID() || null;
  },
});

export default () => RepeatHandler(utilsObj);
