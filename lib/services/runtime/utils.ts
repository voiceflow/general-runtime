import { SlotMapping } from '@voiceflow/api-sdk';
import { formatIntentName, replaceVariables, transformStringVariableToNumber } from '@voiceflow/common';
import { IntentRequest } from '@voiceflow/general-types';
import { Runtime, Store } from '@voiceflow/runtime';
import _ from 'lodash';

import { TurnType } from './types';

export const mapEntities = (mappings: SlotMapping[], entities: IntentRequest['payload']['entities'] = [], overwrite = false): object => {
  const variables: Record<string, any> = {};

  const entityMap = entities.reduce<Record<string, string>>(
    (acc, { name, value }) => ({
      ...acc,
      ...(name && value && { [name]: value }),
    }),
    {}
  );

  if (mappings && entities) {
    mappings.forEach((map: SlotMapping) => {
      if (!map.slot) return;

      const toVariable = map.variable;
      const fromSlot = formatIntentName(map.slot);

      // extract slot value from request
      const fromSlotValue = entityMap[fromSlot] || null;

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
