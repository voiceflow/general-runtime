import { replaceVariables } from '@voiceflow/common';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime';

import { CommandAlexaHandler } from '../../command/command.alexa';
import { StreamStateHandler } from '.';

const utilsObj = {
  commandHandler: CommandAlexaHandler(),
  replaceVariables,
};
export const StreamStateAlexaHandler: HandlerFactory<any, typeof utilsObj> = (utilsObj) => {
  const streamStateAlexaHandler = StreamStateHandler(utilsObj);
  return {
    ...streamStateAlexaHandler,
    canHandle: (node, ...args) =>
      streamStateAlexaHandler.canHandle(node, ...args) && node.platform === VoiceflowConstants.PlatformType.ALEXA,
  };
};

export default () => StreamStateAlexaHandler(utilsObj);
