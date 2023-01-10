/**
 * Google carousel needs to be used in favor of general carousel because
 * it uses different no reply handler
 */
import { BaseNode } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime';

import { isGooglePlatform } from '../../utils.google';
import { NoReplyGoogleHandler } from '../noReply/noReply.google';
import { CarouselHandler, handlerUtils } from './carousel';

const utils = {
  ...handlerUtils,
  noReplyHandler: NoReplyGoogleHandler(),
};

export const CarouselGoogleHandler: HandlerFactory<BaseNode.Carousel.Node, typeof handlerUtils> = (utils) => {
  const { handle, canHandle } = CarouselHandler(utils);
  return {
    handle,
    canHandle: (node, ...args) =>
      isGooglePlatform(node.platform as VoiceflowConstants.PlatformType) && canHandle(node, ...args),
  };
};

export default () => CarouselGoogleHandler(utils);
