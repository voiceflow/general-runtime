import { Version } from '@voiceflow/base-types';
import { Constants } from '@voiceflow/general-types';

import { Runtime } from '@/runtime';

import { FrameType, isIntentRequest, PreviousOutputTurn, SpeakFrame, StorageData, StorageType, TurnType } from '../types';

const RepeatHandler = {
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

    const output =
      (repeat === Version.RepeatType.ALL
        ? runtime.turn.get<PreviousOutputTurn>(TurnType.PREVIOUS_OUTPUT)
        : top.storage.get<SpeakFrame>(FrameType.SPEAK)) || '';

    runtime.storage.produce<StorageData>((draft) => {
      draft[StorageType.OUTPUT] += output;
    });

    return top.getNodeID() || null;
  },
};

export default () => RepeatHandler;
