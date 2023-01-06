/**
 * Alexa preliminary needs to be used in favor of general preliminary because
 * it uses different command handler
 */
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime';

import CommandAlexaHandler from '../../command/command.alexa';
import { eventHandlers, PreliminaryHandler } from '.';

const utilsObj = {
  commandHandler: CommandAlexaHandler(),
  eventHandlers,
};
export const PreliminaryAlexaHandler: HandlerFactory<VoiceflowNode.Interaction.Node, typeof utilsObj> = (utilsObj) => {
  const PreliminaryAlexaHandler = PreliminaryHandler(utilsObj);
  return {
    ...PreliminaryAlexaHandler,
    canHandle: (node, ...args) =>
      PreliminaryAlexaHandler.canHandle(node, ...args) && node.platform === VoiceflowConstants.PlatformType.ALEXA,
  };
};

export default () => PreliminaryAlexaHandler(utilsObj);
