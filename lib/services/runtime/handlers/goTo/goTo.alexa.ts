/**
 * Alexa goTo needs to be used in favor of general goTo because
 * it uses different command handler
 */
import { BaseNode } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime/lib/Handler';

import { CommandAlexaHandler } from '../command/command.alexa';
import { GoToHandler } from './goTo';

const utilsObj = {
  commandHandler: CommandAlexaHandler(),
};

export const GoToAlexaHandler: HandlerFactory<BaseNode.GoTo.Node, typeof utilsObj> = (utils) => {
  const { handle, canHandle } = GoToHandler(utils);
  return {
    handle,
    canHandle: (node, ...args) => node.platform === VoiceflowConstants.PlatformType.ALEXA && canHandle(node, ...args),
  };
};

export default () => GoToHandler(utilsObj);
