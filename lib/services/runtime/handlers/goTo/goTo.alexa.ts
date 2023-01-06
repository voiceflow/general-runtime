import { BaseNode } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime/lib/Handler';

import { CommandAlexaHandler } from '../command/command.alexa';
import { GoToHandler } from './goTo';

const utilsObj = {
  commandHandler: CommandAlexaHandler(),
};

export const GoToAlexaHandler: HandlerFactory<BaseNode.GoTo.Node, typeof utilsObj> = (utils) => {
  const GoToAlexaHandler = GoToHandler(utils);
  return {
    ...GoToAlexaHandler,
    canHandle: (node, ...args) =>
      GoToAlexaHandler.canHandle(node, ...args) && node.platform === VoiceflowConstants.PlatformType.ALEXA,
  };
};

export default () => GoToHandler(utilsObj);
