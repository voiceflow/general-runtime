import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';
import wordsToNumbers from 'words-to-numbers';

import { Action, HandlerFactory } from '@/runtime';

import { addButtonsIfExists } from '../../utils';
import { addRepromptIfExists, isGooglePlatform } from '../../utils.google';
import CommandHandler from '../command/command';
import NoInputHandler from '../noReply/noReply.google';

const utilsObj = {
  commandHandler: CommandHandler(),
  noInputHandler: NoInputHandler(),
  wordsToNumbers,
  addButtonsIfExists,
  addRepromptIfExists,
};

export const CaptureGoogleHandler: HandlerFactory<VoiceflowNode.Capture.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => !!node.variable && isGooglePlatform(node.platform as VoiceflowConstants.PlatformType),
  handle: (node, runtime, variables) => {
    const request = runtime.getRequest();

    if (runtime.getAction() === Action.RUNNING) {
      utils.addButtonsIfExists(node, runtime, variables);
      utils.addRepromptIfExists(node, runtime, variables);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    let nextId: string | null = null;

    // check if there is a command in the stack that fulfills intent
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    // check for no input
    if (utils.noInputHandler.canHandle(runtime)) {
      return utils.noInputHandler.handle(node, runtime, variables);
    }

    const { input } = request.payload;

    if (input) {
      const num = utils.wordsToNumbers(input);

      if (typeof num !== 'number' || Number.isNaN(num)) {
        variables.set(node.variable, input);
      } else {
        variables.set(node.variable, num);
      }
    }

    ({ nextId = null } = node);

    return nextId;
  },
});

export default () => CaptureGoogleHandler(utilsObj);