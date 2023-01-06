import { BaseModels, BaseRequest } from '@voiceflow/base-types';
import { transformStringVariableToNumber } from '@voiceflow/common';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

interface GoogleDateTimeSlot {
  seconds: number;
  day: number;
  hours: number;
  nanos: number;
  year: number;
  minutes: number;
  month: number;
}

// TODO: when refactoring adapter we might be able to remove the dialogflow from here
export const isGooglePlatform = (platform: VoiceflowConstants.PlatformType) =>
  [
    VoiceflowConstants.PlatformType.GOOGLE,
    VoiceflowConstants.PlatformType.DIALOGFLOW_ES,
    VoiceflowConstants.PlatformType.DIALOGFLOW_ES_CHAT,
    VoiceflowConstants.PlatformType.DIALOGFLOW_ES_VOICE,
  ].includes(platform);

// TODO: when refactoring adapter this code should be moved there
// we might need to keep this for google-assistant until it is sunset
export const transformDateTimeVariableToString = (date: GoogleDateTimeSlot) => {
  if (!date.year && !date.hours) return ''; // not GoogleDateTime type

  // time type
  if (!date.year) return `${date.hours}:${date.minutes}`;

  // date type
  if (!date.hours) return `${date.day}/${date.month}/${date.year}`;

  // datetime type
  return `${date.day}/${date.month}/${date.year} ${date.hours}:${date.minutes ?? '00'}`;
};

// TODO: when refactoring adapter the specific code should be moved there
// so that we can rely on the general-runtime utils mapEntities fn
// we might need to keep this for google-assistant until it is sunset
export const mapSlots = ({
  mappings,
  entities,
  slots,
  overwrite = false,
}: {
  slots: { [key: string]: string };
  entities?: BaseRequest.IntentRequest['payload']['entities'];
  mappings: BaseModels.SlotMapping[];
  overwrite?: boolean;
  // eslint-disable-next-line sonarjs/cognitive-complexity
}): Record<string, any> => {
  const variables: Record<string, any> = {};

  const entityMap = (entities ?? []).reduce<Record<string, string>>(
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
      const fromSlot = map.slot;

      // extract slot value from request
      const fromSlotValue = slots?.[fromSlot] || entityMap[fromSlot] || null;

      if (toVariable && (fromSlotValue || overwrite)) {
        variables[toVariable] = _.isObject(fromSlotValue)
          ? transformDateTimeVariableToString(fromSlotValue)
          : transformStringVariableToNumber(fromSlotValue);
      }
    });
  }

  return variables;
};
