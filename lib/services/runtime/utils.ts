import { BaseModels, BaseNode, BaseRequest, BaseText, BaseTrace, RuntimeLogs, Text } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables, transformStringVariableToNumber, Utils } from '@voiceflow/common';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';
import cuid from 'cuid';
import _ from 'lodash';
import _cloneDeepWith from 'lodash/cloneDeepWith';
import _uniqBy from 'lodash/uniqBy';
import * as Slate from 'slate';

import { Runtime, Store } from '@/runtime';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { AddTraceFn } from '@/runtime/lib/Runtime/DebugLogging/utils';

import { isPrompt, Output, Prompt, TurnType } from './types';

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

export const addButtonsIfExists = <N extends BaseRequest.NodeButton>(
  node: N,
  runtime: Runtime,
  variables: Store
  // eslint-disable-next-line sonarjs/cognitive-complexity
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

export const getGenericGlobalNoMatchPrompt =
  ({ isPrompt }: { isPrompt: (prompt: unknown) => prompt is Prompt }) =>
  (runtime: Runtime) => {
    const { version } = runtime;
    const prompt = version?.platformData.settings?.globalNoMatch?.prompt;
    return prompt && isPrompt(prompt) ? prompt : null;
  };
export const getGlobalNoMatchPrompt = getGenericGlobalNoMatchPrompt({ isPrompt });

export const getGlobalNoReplyPrompt = (runtime: Runtime) => {
  const { version } = runtime;
  const prompt = version?.platformData.settings?.globalNoReply?.prompt;
  return prompt && isPrompt(prompt) ? prompt : null;
};

export const slateToPlaintext = (content: Readonly<BaseText.SlateTextValue> = []): string =>
  content
    .map((n) => Slate.Node.string(n))
    .join('\n')
    .trim();

export const isPromptContentInitialyzed = (content: BaseText.SlateTextValue | string | null | undefined) =>
  content != null;

export const isPromptContentEmpty = (content: BaseText.SlateTextValue | string | null | undefined) => {
  if (!content) return true;

  if (typeof content === 'string') return !content.trim().length;

  return !slateToPlaintext(content);
};

export const removeEmptyPrompts = (
  prompts: Array<BaseText.SlateTextValue | string>
): Array<BaseText.SlateTextValue | string> =>
  prompts?.filter(
    (prompt) =>
      prompt != null && (typeof prompt === 'string' ? prompt !== EMPTY_AUDIO_STRING : !!slateToPlaintext(prompt))
  ) ?? [];

interface OutputParams<V> {
  output?: V;
  variables?: Record<string, unknown>;
  node?: BaseModels.BaseNode;
  debugLogging: DebugLogging;
  addTrace: AddTraceFn;
  ai?: boolean;
}

export function outputTrace({ node, addTrace, debugLogging, output, variables = {}, ai }: OutputParams<Output>): void {
  const sanitizedVars = sanitizeVariables(variables);

  if (Array.isArray(output)) {
    const content = slateInjectVariables(output, sanitizedVars);
    const plainContent = slateToPlaintext(content);
    const richContent = { id: cuid.slug(), content };

    addTrace({
      type: BaseNode.Utils.TraceType.TEXT,
      payload: { slate: richContent, message: plainContent, ai },
    });
    debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.TEXT, node, {
      plainContent,
      richContent,
    });
  } else {
    const message = replaceVariables(output || '', sanitizedVars);

    addTrace({
      type: BaseNode.Utils.TraceType.SPEAK,
      payload: { message, type: BaseNode.Speak.TraceSpeakType.MESSAGE },
    });
    debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.SPEAK, node, { text: message });
  }
}

export const getDefaultNoReplyTimeoutSeconds = (platform: string | undefined) => {
  const defaultTimeout = 10;

  if (!platform) return defaultTimeout;

  const delayByPlatform: Record<string, number> = {
    [VoiceflowConstants.PlatformType.ALEXA]: 8,
    [VoiceflowConstants.PlatformType.GOOGLE]: 8,
    [VoiceflowConstants.PlatformType.DIALOGFLOW_ES]: 5,
  };

  return delayByPlatform[platform] ?? defaultTimeout;
};

export const addRepromptIfExists = <Node extends VoiceflowNode.Utils.NoReplyNode>(
  node: Node,
  runtime: Runtime,
  variables: Store
): void => {
  const prompt = _.sample(node.noReply?.prompts || node.reprompt ? [node.reprompt] : []);

  if (prompt && typeof prompt === 'string') {
    runtime.trace.addTrace<BaseNode.Utils.BaseTraceFrame<unknown>>({
      type: TurnType.REPROMPT,
      payload: replaceVariables(prompt, variables.getState()),
    });
    return;
  }

  const globalNoReply = getGlobalNoReplyPrompt(runtime)?.content;
  if (globalNoReply && !isPromptContentEmpty(globalNoReply)) {
    runtime.trace.addTrace<BaseNode.Utils.BaseTraceFrame<unknown>>({
      type: TurnType.REPROMPT,
      payload: processOutput(globalNoReply, variables),
    });
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

export const isSlate = (platform: string | undefined) => {
  if (!platform) return false;

  return [VoiceflowConstants.PlatformType.WEBCHAT, VoiceflowConstants.PlatformType.CHATBOT].includes(
    platform as VoiceflowConstants.PlatformType
  );
};
