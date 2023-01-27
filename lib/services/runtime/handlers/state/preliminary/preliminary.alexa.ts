/**
 * Alexa preliminary needs to be used in favor of general preliminary because
 * it uses different command handler
 */
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime';

import CommandAlexaHandler from '../../command/command.alexa';
import { PreliminaryHandler, utilsObj } from '.';

const utils = {
  ...utilsObj,
  commandHandler: CommandAlexaHandler(),
};

export const PreliminaryAlexaHandler: HandlerFactory<VoiceflowNode.Interaction.Node, typeof utils> = (handlerUtils) => {
  const { handle, canHandle } = PreliminaryHandler(handlerUtils);
  return {
    handle,
    canHandle: (node, ...args) => node.platform === VoiceflowConstants.PlatformType.ALEXA && canHandle(node, ...args),
  };
};

export default () => PreliminaryAlexaHandler(utils);
