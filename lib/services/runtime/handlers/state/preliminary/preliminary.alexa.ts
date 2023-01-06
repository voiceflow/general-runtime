import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime';

import CommandAlexaHandler from '../../command/command.alexa';
import { eventHandlers, PreliminaryHandler } from '.';

const utilsObj = {
  commandHandler: CommandAlexaHandler(),
  eventHandlers,
};
export const PreliminaryAlexaHandler: HandlerFactory<VoiceflowNode.Interaction.Node, typeof utilsObj> = (utilsObj) => {
  const preliminaryAlexaHandler = PreliminaryHandler(utilsObj);
  return {
    ...preliminaryAlexaHandler,
    canHandle: (node, ...args) =>
      preliminaryAlexaHandler.canHandle(node, ...args) && node.platform === VoiceflowConstants.PlatformType.ALEXA,
  };
};

export default () => PreliminaryAlexaHandler(utilsObj);
