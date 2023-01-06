import { BaseNode } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime';

import { CommandAlexaHandler } from '../command/command.alexa';
import { NoMatchAlexaHandler } from '../noMatch/noMatch.alexa';
import { CarouselHandler, handlerUtils } from './carousel';

const utils = {
  ...handlerUtils,
  commandHandler: CommandAlexaHandler(),
  noMatchHandler: NoMatchAlexaHandler(),
};

export const CarouselAlexaHandler: HandlerFactory<BaseNode.Carousel.Node, typeof handlerUtils> = (utils) => {
  const cardV2AlexaHandler = CarouselHandler(utils);
  return {
    ...cardV2AlexaHandler,
    canHandle: (node, ...args) =>
      cardV2AlexaHandler.canHandle(node, ...args) && node.platform === VoiceflowConstants.PlatformType.ALEXA,
  };
};

export default () => CarouselHandler(utils);
