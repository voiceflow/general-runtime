import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseModels, BaseNode } from '@voiceflow/base-types';
import { formatIntentName, replaceVariables, transformStringVariableToNumber } from '@voiceflow/common';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';
import { Slot } from 'ask-sdk-model';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';
import { Turn } from '@/runtime/lib/constants/flags.alexa';

const ALEXA_AUTHORITY = 'AlexaEntities';

export const mapSlots = ({
  slots,
  mappings,
  overwrite = false,
}: {
  slots: { [key: string]: Slot };
  mappings: BaseModels.SlotMapping[];
  overwrite?: boolean;
}): Record<string, any> => {
  const variables: Record<string, any> = {};

  if (mappings && slots) {
    mappings.forEach((map: BaseModels.SlotMapping) => {
      if (!map.slot) return;

      const toVariable = map.variable;
      const fromSlot = formatIntentName(map.slot);

      const resolution = slots[fromSlot]?.resolutions?.resolutionsPerAuthority?.[0];
      const fromSlotValue =
        (resolution?.authority !== ALEXA_AUTHORITY && resolution?.values?.[0].value?.name) ||
        slots[fromSlot]?.value ||
        null;

      if (toVariable && (fromSlotValue || overwrite)) {
        variables[toVariable] = transformStringVariableToNumber(fromSlotValue);
      }
    });
  }

  return variables;
};

const convertDeprecatedReprompt = <B extends VoiceflowNode.Utils.NoReplyNode>(node: B) => ({
  ...node,
  noReply: {
    ...node.noReply,
    prompts: node.noReply?.prompts || (node.reprompt ? [node.reprompt] : []),
  },
});

export const addRepromptIfExists = <B extends VoiceflowNode.Utils.NoReplyNode>({
  node,
  runtime,
  variables,
}: {
  node: B;
  runtime: Runtime;
  variables: Store;
}): void => {
  const noReplyNode = convertDeprecatedReprompt(node);

  const reprompt = noReplyNode.noReply.prompts?.length
    ? _.sample(noReplyNode.noReply.prompts)
    : getGlobalNoReplyPrompt(runtime)?.content;

  if (reprompt && typeof reprompt === 'string') {
    runtime.trace.addTrace<BaseNode.Utils.BaseTraceFrame<unknown>>({
      type: Turn.REPROMPT,
      payload: replaceVariables(reprompt, variables.getState()),
    });
  }
};

interface Prompt {
  voice: AlexaConstants.Voice;
  content: string;
}
const isPrompt = (prompt: unknown): prompt is Prompt => {
  if (!prompt || typeof prompt !== 'object') return false;
  return 'voice' in prompt && 'content' in prompt;
};

export const getGlobalNoMatchPrompt = (runtime: Runtime) => {
  const { version } = runtime;
  const prompt = version?.platformData.settings?.globalNoMatch?.prompt;
  return prompt && isPrompt(prompt) ? prompt : null;
};

const getGlobalNoReplyPrompt = (runtime: Runtime) => {
  const { version } = runtime;
  return isPrompt(version?.platformData?.settings.globalNoReply?.prompt)
    ? version?.platformData?.settings.globalNoReply?.prompt
    : null;
};
