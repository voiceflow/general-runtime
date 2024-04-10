/**
 * Alexa cardV2 needs to be used in favor of general cardV2 because
 * it uses different command handler
 */
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime';

import { CommandAlexaHandler } from '../command/command.alexa';
import { CardV2Handler, utilsObj } from './cardV2';

const utils = {
  ...utilsObj,
  commandHandler: CommandAlexaHandler(),
};

export const CardV2AlexaHandler: HandlerFactory<VoiceflowNode.CardV2.Node, typeof utils> = (
  handlerUtils
) => {
  const { handle, canHandle } = CardV2Handler(handlerUtils);
  return {
    handle,
    canHandle: (node, ...args) =>
      node.platform === VoiceflowConstants.PlatformType.ALEXA && canHandle(node, ...args),
  };
};

export default () => CardV2AlexaHandler(utils);
