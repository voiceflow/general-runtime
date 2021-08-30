import { SlotMapping } from '@voiceflow/api-sdk';
import { Node, Request, Text, Trace } from '@voiceflow/base-types';
import { Node as ChatNode } from '@voiceflow/chat-types';
import { replaceVariables, transformStringVariableToNumber } from '@voiceflow/common';
import { Node as VoiceNode } from '@voiceflow/voice-types';
import _ from 'lodash';
import _cloneDeepWith from 'lodash/cloneDeepWith';
import _isString from 'lodash/isString';
import { Text as SlateText } from 'slate';

import { Runtime, Store } from '@/runtime';

import { TurnType } from './types';

export const mapEntities = (
  mappings: SlotMapping[],
  entities: Request.IntentRequest['payload']['entities'] = [],
  overwrite = false
): Record<string, string | number | null> => {
  const variables: Record<string, string | number | null> = {};

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

export const slateInjectVariables = (slateValue: Text.SlateTextValue, variables: Record<string, unknown>): Text.SlateTextValue => {
  // return undefined to recursively clone object https://stackoverflow.com/a/52956848
  const customizer = (value: any) => (_isString(value) ? replaceVariables(value, variables, undefined, { trim: false }) : undefined);

  return _cloneDeepWith(slateValue, customizer);
};

export const addRepromptIfExists = <N extends VoiceNode.Utils.NodeReprompt | ChatNode.Utils.NodeReprompt>(
  { reprompt }: N,
  runtime: Runtime,
  variables: Store
): void => {
  if (reprompt) {
    runtime.turn.set(
      TurnType.REPROMPT,
      _isString(reprompt) ? replaceVariables(reprompt, variables.getState()) : slateInjectVariables(reprompt, variables.getState())
    );
  }
};

export const addButtonsIfExists = <N extends Request.NodeButton>(node: N, runtime: Runtime, variables: Store): void => {
  let buttons: Request.AnyRequestButton[] = [];
  if (node.buttons?.length) {
    buttons = node.buttons
      .filter(({ name }) => name)
      .map(({ name, request }) => {
        if (Request.isTextRequest(request)) {
          return {
            name: replaceVariables(name, variables.getState()),
            request: {
              ...request,
              payload: replaceVariables(request.payload, variables.getState()),
            },
          };
        }

        if (Request.isIntentRequest(request)) {
          return {
            name: replaceVariables(name, variables.getState()),
            request: {
              ...request,
              payload: {
                ...request.payload,
                query: replaceVariables(request.payload.query, variables.getState()),
              },
            },
          };
        }

        return {
          name: replaceVariables(name, variables.getState()),
          request,
        };
      });
  }

  // needs this to do not break existing programs
  else if (node.chips?.length) {
    buttons = node.chips.map(({ label }) => {
      const name = replaceVariables(label, variables.getState());

      return { name, request: { type: Request.RequestType.TEXT, payload: name } };
    });
  }

  buttons = _.uniqBy(buttons, (button) => button.name);

  if (buttons.length) {
    runtime.trace.addTrace<Trace.ChoiceTrace>({
      type: Node.Utils.TraceType.CHOICE,
      payload: { buttons },
    });
  }
};

export const getReadableConfidence = (confidence?: number) => ((confidence ?? 1) * 100).toFixed(2);

export const slateToPlaintext = (content: Text.SlateTextValue = []): string =>
  content.reduce<string>((acc, node) => acc + (SlateText.isText(node) ? node.text : slateToPlaintext(node.children)), '');
