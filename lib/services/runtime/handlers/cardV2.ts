import { AnyRecord, BaseNode, BaseText, BaseTrace } from '@voiceflow/base-types';
import { deepVariableSubstitution, replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory } from '@/runtime';

import { StorageType } from '../types';
import { slateInjectVariables, slateToPlaintext } from '../utils';
import { isGooglePlatform } from '../utils.google';
import CommandHandler from './command/command';
import { CommandAlexaHandler } from './command/command.alexa';
import NoMatchHandler from './noMatch/noMatch';
import { NoMatchAlexaHandler } from './noMatch/noMatch.alexa';
import { NoMatchGoogleHandler } from './noMatch/noMatch.google';
import NoReplyHandler, { addNoReplyTimeoutIfExists } from './noReply/noReply';
import { NoReplyGoogleHandler } from './noReply/noReply.google';

const handlerUtils = {
  commandHandler: (node: VoiceflowNode.CardV2.Node) =>
    node.platform === VoiceflowConstants.PlatformType.ALEXA ? CommandAlexaHandler() : CommandHandler(),
  noMatchHandler: (node: VoiceflowNode.CardV2.Node) => {
    if (node.platform === VoiceflowConstants.PlatformType.ALEXA) return NoMatchAlexaHandler();
    if (isGooglePlatform(node.platform as VoiceflowConstants.PlatformType)) return NoMatchGoogleHandler();
    return NoMatchHandler();
  },
  noReplyHandler: (node: VoiceflowNode.CardV2.Node) =>
    isGooglePlatform(node.platform as VoiceflowConstants.PlatformType) ? NoReplyGoogleHandler() : NoReplyHandler(),

  slateToPlaintext,
  sanitizeVariables,
  slateInjectVariables,
  deepVariableSubstitution,
  addNoReplyTimeoutIfExists,
};

const getDescription = (
  variablesMap: Readonly<AnyRecord>,
  node: VoiceflowNode.CardV2.Node,
  slateToPlaintext: (content?: readonly BaseText.Descendant[]) => string,
  slateInjectVariables: (
    slateValue: BaseText.SlateTextValue,
    variables: Record<string, unknown>
  ) => BaseText.SlateTextValue,
  sanitizeVariables: (variables: Record<string, unknown>) => Record<string, unknown>
) => {
  let description: string | { slate: BaseText.SlateTextValue; text: string };

  if (typeof node.description === 'string') {
    const parsedDescription = replaceVariables(node.description, variablesMap);
    description = {
      text: parsedDescription,
      slate: [{ text: parsedDescription }],
    };
  } else {
    const slateValue = slateInjectVariables(
      node.description as BaseText.SlateTextValue,
      sanitizeVariables(variablesMap)
    );
    description = {
      slate: slateValue,
      text: slateToPlaintext(slateValue),
    };
  }
  return description;
};

export const CardV2Handler: HandlerFactory<VoiceflowNode.CardV2.Node, typeof handlerUtils> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.CARD_V2,

  handle: (node, runtime, variables) => {
    const isStartingFromCardV2Step = runtime.getAction() === Action.REQUEST && !runtime.getRequest();
    const defaultPath = node.nextId || null;
    const { isBlocking } = node;

    if (runtime.getAction() === Action.RUNNING || isStartingFromCardV2Step) {
      const variablesMap = variables.getState();
      const description = getDescription(
        variablesMap,
        node,
        utils.slateToPlaintext,
        utils.slateInjectVariables,
        utils.sanitizeVariables
      );

      const title = replaceVariables(node.title, variablesMap);

      const buttons = node.buttons.map((button) => utils.deepVariableSubstitution(button, variablesMap));

      if (title || buttons.length || description.text || node.imageUrl) {
        runtime.trace.addTrace<BaseNode.CardV2.TraceFrame>({
          type: BaseTrace.TraceType.CARD_V2,
          payload: {
            imageUrl: node.imageUrl,
            description,
            buttons,
            title,
          },
        });
      }

      if (isBlocking) {
        utils.addNoReplyTimeoutIfExists(node, runtime);

        runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);
        runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);

        return node.id;
      }

      return defaultPath;
    }

    if (runtime.getAction() === Action.REQUEST && utils.commandHandler(node).canHandle(runtime))
      return utils.commandHandler(node).handle(runtime, variables);

    if (!isBlocking) return null;

    if (utils.noReplyHandler(node).canHandle(runtime))
      return utils.noReplyHandler(node).handle(node, runtime, variables);

    return utils.noMatchHandler(node).handle(node, runtime, variables);
  },
});

export default () => CardV2Handler(handlerUtils);
