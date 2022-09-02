import { BaseNode, BaseText, BaseTrace } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory } from '@/runtime';

import { StorageType } from '../types';
import { slateInjectVariables, slateToPlaintext } from '../utils';
import CommandHandler from './command';
import NoMatchHandler from './noMatch';
import NoReplyHandler, { addNoReplyTimeoutIfExists } from './noReply';

const handlerUtils = {
  commandHandler: CommandHandler(),
  noMatchHandler: NoMatchHandler(),
  noReplyHandler: NoReplyHandler(),

  slateToPlaintext,
  sanitizeVariables,
  slateInjectVariables,
  addNoReplyTimeoutIfExists,
};

export const CardV2Handler: HandlerFactory<VoiceflowNode.CardV2.Node, typeof handlerUtils> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.CARD_V2,
  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle: (node, runtime, variables) => {
    const isStartingFromCardV2Step = runtime.getAction() === Action.REQUEST && !runtime.getRequest();
    const defaultPath = node.nextId || null;
    const { isBlocking } = node;

    if (runtime.getAction() === Action.RUNNING || isStartingFromCardV2Step) {
      const variablesMap = variables.getState();
      let description: string | { slate: BaseText.SlateTextValue; text: string };

      if (typeof node.description === 'string') {
        const parsedDescription = replaceVariables(node.description, variablesMap);
        description = {
          text: parsedDescription,
          slate: [{ text: parsedDescription }],
        };
      } else {
        const slateValue = utils.slateInjectVariables(
          node.description as BaseText.SlateTextValue,
          utils.sanitizeVariables(variables.getState())
        );

        description = {
          slate: slateValue,
          text: utils.slateToPlaintext(slateValue),
        };
      }

      const title = replaceVariables(node.title, variablesMap);

      const buttons = node.buttons.map((button) => ({
        ...button,
        name: replaceVariables(button.name, variablesMap),
      }));

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

    if (runtime.getAction() === Action.REQUEST && utils.commandHandler.canHandle(runtime))
      return utils.commandHandler.handle(runtime, variables);

    if (!isBlocking) return null;

    if (utils.noReplyHandler.canHandle(runtime)) return utils.noReplyHandler.handle(node, runtime, variables);

    return utils.noMatchHandler.handle(node, runtime, variables);
  },
});

export default () => CardV2Handler(handlerUtils);
