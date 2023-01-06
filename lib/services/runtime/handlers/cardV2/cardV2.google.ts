/**
 * Google cardV2 needs to be used in favor of general cardV2 because
 * it uses different no reply handler
 */
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime';

import { isGooglePlatform } from '../../utils.google';
import { NoReplyGoogleHandler } from '../noReply/noReply.google';
import { CardV2Handler, handlerUtils } from './cardV2';

const utils = {
  ...handlerUtils,
  noReplyHandler: NoReplyGoogleHandler(),
};

export const CardV2GoogleHandler: HandlerFactory<VoiceflowNode.CardV2.Node, typeof handlerUtils> = (utils) => {
  const cardV2GoogleHandler = CardV2Handler(utils);
  return {
    ...cardV2GoogleHandler,
    canHandle: (node, ...args) =>
      cardV2GoogleHandler.canHandle(node, ...args) &&
      isGooglePlatform(node.platform as VoiceflowConstants.PlatformType),
  };
};

export default () => CardV2Handler(utils);
