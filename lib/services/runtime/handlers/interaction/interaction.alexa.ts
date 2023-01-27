/**
 * Alexa interaction needs to be used in favor of general interaction because
 * it uses different command handler
 */
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime';

import { CommandAlexaHandler } from '../command/command.alexa';
import { InteractionHandler, utilsObj } from './interaction';

const utils = {
  ...utilsObj,
  commandHandler: CommandAlexaHandler(),
};

export const InteractionAlexaHandler: HandlerFactory<VoiceflowNode.Interaction.Node, typeof utils> = (handlerUtils) => {
  const { handle, canHandle } = InteractionHandler(handlerUtils);
  return {
    handle,
    canHandle: (node, ...args) => node.platform === VoiceflowConstants.PlatformType.ALEXA && canHandle(node, ...args),
  };
};

export default () => InteractionAlexaHandler(utils);
