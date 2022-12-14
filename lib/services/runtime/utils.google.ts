import { BaseModels, Text } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables, transformStringVariableToNumber } from '@voiceflow/common';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import {
  EMPTY_AUDIO_STRING,
  isPromptContentEmpty,
  slateInjectVariables,
  slateToPlaintext,
} from '@/lib/services/runtime/utils';
import { Runtime, Store } from '@/runtime';
import { GoogleStorage as Storage } from '@/runtime/lib/Constants';

import { isAnyPrompt } from './types.google';

interface GoogleDateTimeSlot {
  seconds: number;
  day: number;
  hours: number;
  nanos: number;
  year: number;
  minutes: number;
  month: number;
}

export const isGooglePlatform = (platform: VoiceflowConstants.PlatformType) =>
  [
    VoiceflowConstants.PlatformType.GOOGLE,
    VoiceflowConstants.PlatformType.DIALOGFLOW_ES,
    VoiceflowConstants.PlatformType.DIALOGFLOW_ES_CHAT,
    VoiceflowConstants.PlatformType.DIALOGFLOW_ES_VOICE,
  ].includes(platform);

export const transformDateTimeVariableToString = (date: GoogleDateTimeSlot) => {
  if (!date.year && !date.hours) return ''; // not GoogleDateTime type

  // time type
  if (!date.year) return `${date.hours}:${date.minutes}`;

  // date type
  if (!date.hours) return `${date.day}/${date.month}/${date.year}`;

  // datetime type
  return `${date.day}/${date.month}/${date.year} ${date.hours}:${date.minutes ?? '00'}`;
};

export const mapSlots = (
  mappings: BaseModels.SlotMapping[],
  slots: { [key: string]: string },
  overwrite = false
): Record<string, any> => {
  const variables: Record<string, any> = {};

  if (mappings && slots) {
    mappings.forEach((map: BaseModels.SlotMapping) => {
      if (!map.slot) return;

      const toVariable = map.variable;
      const fromSlot = map.slot;

      // extract slot value from request
      const fromSlotValue = slots[fromSlot] || null;

      if (toVariable && (fromSlotValue || overwrite)) {
        variables[toVariable] = _.isObject(fromSlotValue)
          ? transformDateTimeVariableToString(fromSlotValue)
          : transformStringVariableToNumber(fromSlotValue);
      }
    });
  }

  return variables;
};

export const addVariables =
  (regex: typeof replaceVariables) =>
  (value: string | undefined | null, variables: Store, defaultValue = '') =>
    value ? regex(value, variables.getState()) : defaultValue;

export const removeEmptyPrompts = (prompts?: VoiceflowNode.Utils.VoiceflowPrompt[] | null): string[] =>
  prompts?.filter((prompt): prompt is string => typeof prompt === 'string' && prompt !== EMPTY_AUDIO_STRING) ?? [];

export const addRepromptIfExists = <Node extends VoiceflowNode.Utils.NoReplyNode>(
  node: Node,
  runtime: Runtime,
  variables: Store
): void => {
  const prompt = _.sample(node.noReply?.prompts || node.reprompt ? [node.reprompt] : []);

  if (prompt && typeof prompt === 'string') {
    runtime.storage.set(Storage.REPROMPT, replaceVariables(prompt, variables.getState()));
    return;
  }

  const globalNoReply = getGlobalNoReplyPrompt(runtime)?.content;
  if (globalNoReply && !isPromptContentEmpty(globalNoReply)) {
    runtime.storage.set(Storage.REPROMPT, processOutput(globalNoReply, variables));
  }
};

export const processOutput = (output: string | Text.SlateTextValue | undefined, variables: Store): string => {
  if (!output) return '';

  const sanitizedVars = sanitizeVariables(variables.getState());
  // handle voice string
  if (typeof output === 'string') {
    return replaceVariables(output, sanitizedVars);
  }

  // handle slate text
  const content = slateInjectVariables(output, sanitizedVars);
  return slateToPlaintext(content);
};

export const getGlobalNoMatchPrompt = (runtime: Runtime) => {
  const { version } = runtime;

  return isAnyPrompt(version?.platformData.settings?.globalNoMatch?.prompt)
    ? version?.platformData.settings?.globalNoMatch?.prompt
    : null;
};

export const getGlobalNoReplyPrompt = (runtime: Runtime) => {
  const { version } = runtime;
  return isAnyPrompt(version?.platformData?.settings.globalNoReply?.prompt)
    ? version?.platformData?.settings.globalNoReply?.prompt
    : null;
};
