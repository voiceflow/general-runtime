import { SlotMapping } from '@voiceflow/api-sdk';
import { IntentRequestSlot } from '@voiceflow/general-types';
import { formatIntentName, replaceVariables, Runtime, Store, transformStringVariableToNumber } from '@voiceflow/runtime';
import _ from 'lodash';

import { TurnType } from './types';

export const mapSlots = (mappings: SlotMapping[], slots: Partial<Record<string, IntentRequestSlot>>, overwrite = false): object => {
  const variables: Record<string, any> = {};

  if (mappings && slots) {
    mappings.forEach((map: SlotMapping) => {
      if (!map.slot) return;

      const toVariable = map.variable;
      const fromSlot = formatIntentName(map.slot);

      // extract slot value from request
      const fromSlotValue = slots[fromSlot]?.value || null;

      if (toVariable && (fromSlotValue || overwrite)) {
        variables[toVariable] = transformStringVariableToNumber(fromSlotValue);
      }
    });
  }

  return variables;
};

export const addRepromptIfExists = <B extends { reprompt?: string }>(node: B, runtime: Runtime, variables: Store): void => {
  if (node.reprompt) {
    runtime.turn.set(TurnType.REPROMPT, replaceVariables(node.reprompt, variables.getState()));
  }
};
