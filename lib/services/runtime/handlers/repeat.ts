import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseVersion } from '@voiceflow/base-types';
import * as DTO from '@voiceflow/dtos';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { Runtime, Store } from '@/runtime';

import { FrameType, Output, StorageType, TurnType } from '../types';
import { addOutputTrace, getOutputTrace } from '../utils';

const utilsObj = {
  addOutputTrace,
  getOutputTrace,
};

const repeatIntents = new Set<string>([VoiceflowConstants.IntentName.REPEAT, AlexaConstants.AmazonIntent.REPEAT]);

export const RepeatHandler = (utils: typeof utilsObj) => ({
  canHandle: (runtime: Runtime): boolean => {
    const repeat = runtime.storage.get<BaseVersion.RepeatType>(StorageType.REPEAT);
    const request = runtime.getRequest();
    return (
      DTO.isLegacyIntentRequest(request) &&
      repeatIntents.has(request.payload.intent.name) &&
      !!repeat &&
      [BaseVersion.RepeatType.ALL, BaseVersion.RepeatType.DIALOG].includes(repeat)
    );
  },
  handle: (runtime: Runtime, variables: Store) => {
    const repeat = runtime.storage.get<BaseVersion.RepeatType>(StorageType.REPEAT);
    const top = runtime.stack.top();

    const output =
      repeat === BaseVersion.RepeatType.ALL
        ? runtime.turn.get<Output>(TurnType.PREVIOUS_OUTPUT)
        : top.storage.get<Output>(FrameType.OUTPUT);

    if (output) {
      utils.addOutputTrace(
        runtime,
        utils.getOutputTrace({
          output,
          version: runtime.version,
          variables,
        }),
        { variables }
      );
    }

    return top.getNodeID() || null;
  },
});

export default () => RepeatHandler(utilsObj);
