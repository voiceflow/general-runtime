import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime';

import { isGooglePlatform } from '../../utils.google';
import { NoReplyGoogleHandler } from '../noReply/noReply.google';
import { CardV2Handler, handlerUtils } from './cardV2';

const utils = {
  ...handlerUtils,
  noReplyHandler: NoReplyGoogleHandler(),
};

export const CardV2AlexaHandler: HandlerFactory<VoiceflowNode.CardV2.Node, typeof handlerUtils> = (utils) => {
  const cardV2AlexaHandler = CardV2Handler(utils);
  return {
    ...cardV2AlexaHandler,
    canHandle: (node, ...args) =>
      cardV2AlexaHandler.canHandle(node, ...args) && isGooglePlatform(node.platform as VoiceflowConstants.PlatformType),
  };
};

export default () => CardV2Handler(utils);
