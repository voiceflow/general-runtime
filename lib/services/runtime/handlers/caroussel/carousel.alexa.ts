/**
 * Alexa carousel needs to be used in favor of general carousel because
 * it uses different command handler
 * it uses different no match handler
 */
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
  const CarouselAlexaHandler = CarouselHandler(utils);
  return {
    ...CarouselAlexaHandler,
    canHandle: (node, ...args) =>
      CarouselAlexaHandler.canHandle(node, ...args) && node.platform === VoiceflowConstants.PlatformType.ALEXA,
  };
};

export default () => CarouselHandler(utils);
