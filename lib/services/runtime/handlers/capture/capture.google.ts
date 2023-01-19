/**
 * Google capture needs to be used in favor of general capture because
 * it adds reprompts if exists
 * it handles capture very differently
 */
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';
import wordsToNumbers from 'words-to-numbers';

import { Action, HandlerFactory } from '@/runtime';

import { addButtonsIfExists, addRepromptIfExists } from '../../utils';
import { isGooglePlatform } from '../../utils.google';
import CommandHandler from '../command';
import { addNoReplyTimeoutIfExists } from '../noReply';
import NoReplyHandler from '../noReply/noReply.google';

const utilsObj = {
  commandHandler: CommandHandler(),
  noReplyHandler: NoReplyHandler(),
  wordsToNumbers,
  addButtonsIfExists,
  addRepromptIfExists,
  addNoReplyTimeoutIfExists,
};

export const CaptureGoogleHandler: HandlerFactory<VoiceflowNode.Capture.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => isGooglePlatform(node.platform as VoiceflowConstants.PlatformType) && !!node.variable,
  handle: (node, runtime, variables) => {
    const request = runtime.getRequest();

    if (runtime.getAction() === Action.RUNNING) {
      utils.addButtonsIfExists(node, runtime, variables);
      utils.addRepromptIfExists(node, runtime, variables);
      utils.addNoReplyTimeoutIfExists(node, runtime);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    let nextId: string | null = null;

    // check if there is a command in the stack that fulfills intent
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    // check for no input
    if (utils.noReplyHandler.canHandle(runtime)) {
      return utils.noReplyHandler.handle(node, runtime, variables);
    }

    const { input, query } = request.payload;

    // TODO: refactor on adapter code
    // prototype tool sends input on query, dialogflow sends on input
    if (input ?? query) {
      const num = utils.wordsToNumbers(input ?? query);

      if (typeof num !== 'number' || Number.isNaN(num)) {
        variables.set(node.variable, input ?? query);
      } else {
        variables.set(node.variable, num);
      }
    }

    ({ nextId = null } = node);

    return nextId;
  },
});

export default () => CaptureGoogleHandler(utilsObj);
