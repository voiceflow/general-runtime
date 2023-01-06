import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseModels, BaseRequest } from '@voiceflow/base-types';
import { formatIntentName, transformStringVariableToNumber } from '@voiceflow/common';

import { SlotValue } from './types.alexa';
import { getGenericGlobalNoMatchPrompt } from './utils';

const ALEXA_AUTHORITY = 'AlexaEntities';

export const mapSlots = ({
  slots,
  entities,
  mappings,
  overwrite = false,
}: {
  slots: {
    [key: string]: SlotValue;
  };
  entities?: BaseRequest.IntentRequest['payload']['entities'];
  mappings: BaseModels.SlotMapping[];
  overwrite?: boolean;
}): Record<string, any> => {
  const variables: Record<string, any> = {};

  const entityMap = (entities ?? []).reduce<Record<string, any>>(
    (acc, { name, value }) => ({
      ...acc,
      ...(name && value && { [name]: value }),
    }),
    {}
  );

  if (mappings && (slots || entities)) {
    mappings.forEach((map: BaseModels.SlotMapping) => {
      if (!map.slot) return;

      const toVariable = map.variable;
      const fromSlot = formatIntentName(map.slot);

      const resolution = slots?.[fromSlot]?.resolutions?.resolutionsPerAuthority?.[0];
      const fromSlotValue =
        (resolution?.authority !== ALEXA_AUTHORITY && resolution?.values?.[0].value?.name) ||
        slots?.[fromSlot]?.value ||
        entityMap[fromSlot] ||
        null;
      if (toVariable && (fromSlotValue || overwrite)) {
        variables[toVariable] = transformStringVariableToNumber(fromSlotValue);
      }
    });
  }

  return variables;
};

interface Prompt {
  voice: AlexaConstants.Voice;
  content: string;
}

const isPrompt = (prompt: unknown): prompt is Prompt => {
  if (!prompt || typeof prompt !== 'object') return false;
  return 'voice' in prompt && 'content' in prompt;
};

export const getGlobalNoMatchPrompt = getGenericGlobalNoMatchPrompt({ isPrompt });
