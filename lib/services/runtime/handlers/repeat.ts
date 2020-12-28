import { IntentName, RepeatType } from '@voiceflow/general-types';
import { Runtime } from '@voiceflow/runtime';

import { FrameType, isIntentRequest, PreviousOutputTurn, SpeakFrame, StorageData, StorageType, TurnType } from '../types';

const RepeatHandler = {
  canHandle: (runtime: Runtime): boolean => {
    const repeat = runtime.storage.get<RepeatType>(StorageType.REPEAT);
    const request = runtime.getRequest();
    return (
      isIntentRequest(request) &&
      request?.payload.intent.name === IntentName.REPEAT &&
      !!repeat &&
      [RepeatType.ALL, RepeatType.DIALOG].includes(repeat)
    );
  },
  handle: (runtime: Runtime) => {
    const repeat = runtime.storage.get<RepeatType>(StorageType.REPEAT);
    const top = runtime.stack.top();

    const output =
      (repeat === RepeatType.ALL ? runtime.turn.get<PreviousOutputTurn>(TurnType.PREVIOUS_OUTPUT) : top.storage.get<SpeakFrame>(FrameType.SPEAK)) ||
      '';

    runtime.storage.produce<StorageData>((draft) => {
      draft[StorageType.OUTPUT] += output;
    });

    return top.getNodeID() || null;
  },
};

export default () => RepeatHandler;
