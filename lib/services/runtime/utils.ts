import { BaseModels, BaseNode, BaseRequest, BaseText, BaseTrace } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables, transformStringVariableToNumber, Utils } from '@voiceflow/common';
import cuid from 'cuid';
import _cloneDeepWith from 'lodash/cloneDeepWith';
import _uniqBy from 'lodash/uniqBy';
import * as Slate from 'slate';

import { Runtime, Store } from '@/runtime';

import { Output } from './types';

export const EMPTY_AUDIO_STRING = '<audio src=""/>';

export const mapEntities = (
  mappings: BaseModels.SlotMapping[],
  entities: BaseRequest.IntentRequest['payload']['entities'] = [],
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
    mappings.forEach((map: BaseModels.SlotMapping) => {
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

export const slateInjectVariables = (
  slateValue: BaseText.SlateTextValue,
  variables: Record<string, unknown>
): BaseText.SlateTextValue => {
  // return undefined to recursively clone object https://stackoverflow.com/a/52956848
  const customizer = (value: any) =>
    typeof value === 'string' ? replaceVariables(value, variables, undefined, { trim: false }) : undefined;

  return _cloneDeepWith(slateValue, customizer);
};

const processActions = (actions: BaseRequest.Action.BaseAction<unknown>[] | undefined, variables: Store) =>
  actions?.map((action) => {
    if (BaseRequest.Action.isOpenURLAction(action)) {
      return {
        ...action,
        payload: { ...action.payload, url: replaceVariables(action.payload.url, variables.getState()) },
      };
    }

    return action;
  });

// eslint-disable-next-line sonarjs/cognitive-complexity
export const addButtonsIfExists = <N extends BaseRequest.NodeButton>(
  node: N,
  runtime: Runtime,
  variables: Store
): void => {
  let buttons: BaseRequest.AnyRequestButton[] = [];

  if (node.buttons?.length) {
    buttons = node.buttons
      .filter(({ name }) => name)
      .map(({ name, request }) => {
        const processedName = replaceVariables(name, variables.getState());

        if (BaseRequest.isTextRequest(request)) {
          return {
            name: processedName,
            request: {
              ...request,
              payload: replaceVariables(request.payload, variables.getState()),
            },
          };
        }

        const actions = processActions(request.payload?.actions, variables);

        if (BaseRequest.isIntentRequest(request)) {
          return {
            name: processedName,
            request: {
              ...request,
              payload: {
                ...request.payload,
                query: replaceVariables(request.payload.query, variables.getState()),
                label: request.payload.label && replaceVariables(request.payload.label, variables.getState()),
                actions,
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
                actions,
              },
            },
          };
        }

        return {
          name: processedName,
          request: {
            ...request,
            payload: !Utils.object.isObject(request.payload) ? request.payload : { ...request.payload, actions },
          },
        };
      });
  }

  // needs this to do not break existing programs
  else if (node.chips?.length) {
    buttons = node.chips.map(({ label }) => {
      const name = replaceVariables(label, variables.getState());

      return { name, request: { type: BaseRequest.RequestType.TEXT, payload: name } };
    });
  }

  buttons = _uniqBy(buttons, (button) => button.name);

  if (buttons.length) {
    runtime.trace.addTrace<BaseTrace.ChoiceTrace>({
      type: BaseNode.Utils.TraceType.CHOICE,
      payload: { buttons },
    });
  }
};

export const getReadableConfidence = (confidence?: number): string => ((confidence ?? 1) * 100).toFixed(2);

export const slateToPlaintext = (content: Readonly<BaseText.SlateTextValue> = []): string =>
  content
    .map((n) => Slate.Node.string(n))
    .join('\n')
    .trim();

export const removeEmptyPrompts = (
  prompts: Array<BaseText.SlateTextValue | string>
): Array<BaseText.SlateTextValue | string> =>
  prompts.filter(
    (prompt) =>
      prompt != null && (typeof prompt === 'string' ? prompt !== EMPTY_AUDIO_STRING : !!slateToPlaintext(prompt))
  );

interface OutputParams<V> {
  output?: V;
  variables?: Record<string, unknown>;
}

export function outputTrace(params: OutputParams<BaseText.SlateTextValue>): BaseTrace.TextTrace;
export function outputTrace(params: OutputParams<string>): BaseTrace.SpeakTrace;
export function outputTrace(params: OutputParams<Output>): BaseTrace.TextTrace | BaseTrace.SpeakTrace;
export function outputTrace({ output, variables = {} }: OutputParams<Output>) {
  const sanitizedVars = sanitizeVariables(variables);

  if (Array.isArray(output)) {
    const content = slateInjectVariables(output, sanitizedVars);
    const message = slateToPlaintext(content);

    return {
      type: BaseNode.Utils.TraceType.TEXT,
      payload: { slate: { id: cuid.slug(), content }, message },
    };
  }
  const message = replaceVariables(output || '', sanitizedVars);

  return {
    type: BaseNode.Utils.TraceType.SPEAK,
    payload: { message, type: BaseNode.Speak.TraceSpeakType.MESSAGE },
  };
}
