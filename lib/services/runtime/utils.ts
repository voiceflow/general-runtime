import { Models, Node, Request, Text, Trace } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables, transformStringVariableToNumber } from '@voiceflow/common';
import cuid from 'cuid';
import _cloneDeepWith from 'lodash/cloneDeepWith';
import _isString from 'lodash/isString';
import _uniqBy from 'lodash/uniqBy';
import { Text as SlateText } from 'slate';

import { Runtime, Store } from '@/runtime';

import { Output } from './types';

export const EMPTY_AUDIO_STRING = '<audio src=""/>';

export const mapEntities = (
  mappings: Models.SlotMapping[],
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
    mappings.forEach((map: Models.SlotMapping) => {
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

export const addButtonsIfExists = <N extends Request.NodeButton>(node: N, runtime: Runtime, variables: Store): void => {
  let buttons: Request.AnyRequestButton[] = [];

  if (node.buttons?.length) {
    buttons = node.buttons
      .filter(({ name }) => name)
      .map(({ name, request }) => {
        const processedName = replaceVariables(name, variables.getState());

        if (Request.isTextRequest(request)) {
          return {
            name: processedName,
            request: {
              ...request,
              payload: replaceVariables(request.payload, variables.getState()),
            },
          };
        }

        if (Request.isIntentRequest(request)) {
          return {
            name: processedName,
            request: {
              ...request,
              payload: {
                ...request.payload,
                query: replaceVariables(request.payload.query, variables.getState()),
                label: request.payload.label && replaceVariables(request.payload.label, variables.getState()),
              },
            },
          };
        }

        if (typeof request.payload?.label === 'string') {
          return {
            name: processedName,
            request: {
              ...request,
              payload: {
                ...request.payload,
                label: replaceVariables(request.payload.label, variables.getState()),
              },
            },
          };
        }

        return {
          name: processedName,
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

  buttons = _uniqBy(buttons, (button) => button.name);

  if (buttons.length) {
    runtime.trace.addTrace<Trace.ChoiceTrace>({
      type: Node.Utils.TraceType.CHOICE,
      payload: { buttons },
    });
  }
};

export const getReadableConfidence = (confidence?: number): string => ((confidence ?? 1) * 100).toFixed(2);

export const slateToPlaintext = (content: Text.SlateTextValue = []): string =>
  content.reduce<string>((acc, node) => acc + (SlateText.isText(node) ? node.text : slateToPlaintext(node.children)), '');

export const removeEmptyPrompts = (prompts: Array<Text.SlateTextValue | string>): Array<Text.SlateTextValue | string> =>
  prompts.filter((prompt) => prompt != null && (_isString(prompt) ? prompt !== EMPTY_AUDIO_STRING : !!slateToPlaintext(prompt)));

interface OutputParams<V> {
  output?: V;
  variables?: Record<string, unknown>;
}

export function outputTrace(params: OutputParams<Text.SlateTextValue>): Trace.TextTrace;
export function outputTrace(params: OutputParams<string>): Trace.SpeakTrace;
export function outputTrace(params: OutputParams<Output>): Trace.TextTrace | Trace.SpeakTrace;
export function outputTrace({ output, variables = {} }: OutputParams<Output>) {
  const sanitizedVars = sanitizeVariables(variables);

  if (Array.isArray(output)) {
    const content = slateInjectVariables(output, sanitizedVars);
    const message = slateToPlaintext(content);

    return {
      type: Node.Utils.TraceType.TEXT,
      payload: { slate: { id: cuid.slug(), content }, message },
    };
  }
  const message = replaceVariables(output || '', sanitizedVars);

  return {
    type: Node.Utils.TraceType.SPEAK,
    payload: { message, type: Node.Speak.TraceSpeakType.MESSAGE },
  };
}
