import { SlotMapping } from '@voiceflow/api-sdk';
import { replaceVariables, transformStringVariableToNumber } from '@voiceflow/common';
import { AnyRequestButton, IntentRequest, isTextRequest, NodeWithButtons, NodeWithReprompt, RequestType, TraceType } from '@voiceflow/general-types';
import { TraceFrame as ChoiceFrame } from '@voiceflow/general-types/build/nodes/interaction';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';

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
      const fromSlot = map.slot;

      // extract slot value from request
      const fromSlotValue = entityMap[fromSlot] || null;

      if (toVariable && (fromSlotValue || overwrite)) {
        variables[toVariable] = transformStringVariableToNumber(fromSlotValue);
      }
    });
  }

  return variables;
};

export const addRepromptIfExists = <N extends NodeWithReprompt>(node: N, runtime: Runtime, variables: Store): void => {
  if (node.reprompt) {
    runtime.turn.set(TurnType.REPROMPT, replaceVariables(node.reprompt, variables.getState()));
  }
};

export const addButtonsIfExists = <N extends NodeWithButtons>(node: N, runtime: Runtime, variables: Store): void => {
  let buttons: AnyRequestButton[] = [];
  if (node.buttons?.length) {
    buttons = node.buttons
      .filter(({ name }) => name)
      .map(({ name, request }) => {
        return isTextRequest(request)
          ? {
              name: replaceVariables(name, variables.getState()),
              request: {
                ...request,
                payload: replaceVariables(request.payload, variables.getState()),
              },
            }
          : {
              name: replaceVariables(name, variables.getState()),
              request: {
                ...request,
                payload: {
                  ...request.payload,
                  query: replaceVariables(request.payload.query, variables.getState()),
                },
              },
            };
      });
  }

  // needs this to do not break existing programs
  else if (node.chips?.length) {
    buttons = node.chips.map(({ label }) => {
      const name = replaceVariables(label, variables.getState());

      return { name, request: { type: RequestType.TEXT, payload: name } };
    });
  }

  buttons = _.uniqBy(buttons, (button) => button.name);

  if (buttons.length) {
    runtime.trace.addTrace<ChoiceFrame>({
      type: TraceType.CHOICE,
      payload: { buttons },
    });
  }
};

export const getReadableConfidence = (confidence?: number) => ((confidence ?? 1) * 100).toFixed(2);
