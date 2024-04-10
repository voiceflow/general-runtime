/**
 * Alexa goTo needs to be used in favor of general goTo because
 * it uses different command handler
 */
import { BaseNode } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime/lib/Handler';

import { CommandAlexaHandler } from '../command/command.alexa';
import { GoToHandler, utilsObj } from './goTo';

const utils = {
  ...utilsObj,
  commandHandler: CommandAlexaHandler(),
};

export const GoToAlexaHandler: HandlerFactory<BaseNode.GoTo.Node, typeof utils> = (
  handlerUtils
) => {
  const { handle, canHandle } = GoToHandler(handlerUtils);
  return {
    handle,
    canHandle: (node, ...args) =>
      node.platform === VoiceflowConstants.PlatformType.ALEXA && canHandle(node, ...args),
  };
};

export default () => GoToAlexaHandler(utils);
