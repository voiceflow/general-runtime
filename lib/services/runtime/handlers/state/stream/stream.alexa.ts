/**
 * Alexa stream needs to be used in favor of general stream because
 * it uses different command handler
 * it also need to handle directives containing audio elements
 */
import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseModels, BaseNode } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { HandlerFactory, Runtime } from '@/runtime';

import { isIntentRequest } from '../../../types';
import { CommandAlexaHandler } from '../../command/command.alexa';
import { StreamStateHandler, utilsObj } from '.';

const utils = {
  ...utilsObj,
  commandHandler: CommandAlexaHandler(),
};

// we need to account for the edge case where there is a custom directive with an audio (like a stream)
// in said case we need to treat that as a stream when the playback nearly finished intent comes in
const isDirectiveWithAudio = (node: BaseModels.BaseNode, runtime: Runtime) => {
  const request = runtime.getRequest();
  const intentName = isIntentRequest(request) ? request.payload.intent.name : null;
  return (
    node.type === BaseNode.NodeType.CHANNEL_ACTION &&
    (node as BaseNode.ChannelAction.Node).data.name === BaseNode.NodeType.DIRECTIVE &&
    (node as BaseNode.ChannelAction.Node).data.payload.directive.includes('AudioPlayer.Play') &&
    intentName === AlexaConstants.AmazonIntent.PLAYBACK_NEARLY_FINISHED
  );
};

export const StreamStateAlexaHandler: HandlerFactory<any, typeof utils> = (handlerUtils) => {
  const { handle, canHandle } = StreamStateHandler(handlerUtils);
  return {
    handle,
    canHandle: (node, runtime, ...args) =>
      node.platform === VoiceflowConstants.PlatformType.ALEXA &&
      (canHandle(node, runtime, ...args) || isDirectiveWithAudio(node, runtime)),
  };
};

export default () => StreamStateAlexaHandler(utils);
