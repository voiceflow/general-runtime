import { IntentName, IntentRequest, RepeatType } from '@voiceflow/general-types';
import { Context } from '@voiceflow/runtime';

import { FrameType, PreviousOutputTurn, SpeakFrame, StorageData, StorageType, TurnType } from '../types';

const RepeatHandler = {
  canHandle: (context: Context): boolean => {
    const repeat = context.storage.get<RepeatType>(StorageType.REPEAT);
    const request = context.turn.get<IntentRequest>(TurnType.REQUEST);

    return request?.payload.intent.name === IntentName.REPEAT && !!repeat && [RepeatType.ALL, RepeatType.DIALOG].includes(repeat);
  },
  handle: (context: Context) => {
    const repeat = context.storage.get<RepeatType>(StorageType.REPEAT);
    const top = context.stack.top();

    const output =
      (repeat === RepeatType.ALL ? context.turn.get<PreviousOutputTurn>(TurnType.PREVIOUS_OUTPUT) : top.storage.get<SpeakFrame>(FrameType.SPEAK)) ||
      '';

    context.storage.produce<StorageData>((draft) => {
      draft[StorageType.OUTPUT] += output;
    });

    return top.getNodeID() || null;
  },
};

export default () => RepeatHandler;
