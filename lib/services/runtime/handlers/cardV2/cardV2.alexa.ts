/**
 * Alexa cardV2 needs to be used in favor of general cardV2 because
 * it uses different command handler
 * it uses different no match handler
 */
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime';

import { CommandAlexaHandler } from '../command/command.alexa';
import { NoMatchAlexaHandler } from '../noMatch/noMatch.alexa';
import { CardV2Handler, handlerUtils } from './cardV2';

const utils = {
  ...handlerUtils,
  commandHandler: CommandAlexaHandler(),
  noMatchHandler: NoMatchAlexaHandler(),
};

export const CardV2AlexaHandler: HandlerFactory<VoiceflowNode.CardV2.Node, typeof handlerUtils> = (utils) => {
  const cardV2AlexaHandler = CardV2Handler(utils);
  return {
    ...cardV2AlexaHandler,
    canHandle: (node, ...args) =>
      cardV2AlexaHandler.canHandle(node, ...args) && node.platform === VoiceflowConstants.PlatformType.ALEXA,
  };
};

export default () => CardV2Handler(utils);
