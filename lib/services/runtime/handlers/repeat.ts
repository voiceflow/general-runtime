import { Version } from '@voiceflow/base-types';
import { Constants } from '@voiceflow/general-types';
import { slate as SlateUtils } from '@voiceflow/internal';

import { Runtime } from '@/runtime';

import { FrameType, isIntentRequest, PreviousOutputTurn, SpeakFrame, StorageData, StorageType, TextFrame, TurnType } from '../types';

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
      repeat === Version.RepeatType.ALL
        ? runtime.turn.get<PreviousOutputTurn>(TurnType.PREVIOUS_OUTPUT)
        : // for the voice projects text frame should be always empty
          top.storage.get<TextFrame>(FrameType.TEXT) ?? top.storage.get<SpeakFrame>(FrameType.SPEAK);

    runtime.storage.produce<StorageData>((draft) => {
      const draftOutput = draft[StorageType.OUTPUT] || '';

      if (Array.isArray(output)) {
        draft[StorageType.OUTPUT] = [...(Array.isArray(draftOutput) ? draftOutput : [{ children: [{ text: draftOutput }] }]), ...output];
      } else {
        draft[StorageType.OUTPUT] = `${Array.isArray(draftOutput) ? SlateUtils.toPlaintext(draftOutput) : draftOutput}${output || ''}`;
      }
    });

    return top.getNodeID() || null;
  },
};

export default () => RepeatHandler;
