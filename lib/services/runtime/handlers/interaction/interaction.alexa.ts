/**
 * Alexa interaction needs to be used in favor of general interaction because
 * it uses different command handler
 */
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { HandlerFactory, Runtime, Store } from '@/runtime';

import { addOutputTrace, getGlobalNoReplyPrompt, getOutputTrace } from '../../utils';
import { CommandAlexaHandler } from '../command/command.alexa';
import { InteractionHandler, utilsObj } from './interaction';

const convertDeprecatedReprompt = <B extends VoiceflowNode.Utils.NoReplyNode>(node: B) => ({
  ...node,
  noReply: {
    ...node.noReply,
    prompts: node.noReply?.prompts || (node.reprompt ? [node.reprompt] : []),
  },
});

const addNoReplyIfExists = (
  node: VoiceflowNode.Interaction.Node,
  runtime: Runtime,
  variables: Store
) => {
  const noReplyNode = convertDeprecatedReprompt(node);
  const noReplyOutput = noReplyNode.noReply.prompts?.length
    ? _.sample(noReplyNode.noReply.prompts)
    : getGlobalNoReplyPrompt(runtime)?.content;

  if (!noReplyOutput) return;

  addOutputTrace(
    runtime,
    getOutputTrace({
      output: noReplyOutput,
      version: runtime.version,
      variables,
      isPrompt: true,
    }),
    { node }
  );
};

const utils = {
  ...utilsObj,
  commandHandler: CommandAlexaHandler(),
  addNoReplyIfExists,
};

export const InteractionAlexaHandler: HandlerFactory<
  VoiceflowNode.Interaction.Node,
  typeof utils
> = (handlerUtils) => {
  const { handle, canHandle } = InteractionHandler(handlerUtils);
  return {
    handle,
    canHandle: (node, ...args) =>
      node.platform === VoiceflowConstants.PlatformType.ALEXA && canHandle(node, ...args),
  };
};

export default () => InteractionAlexaHandler(utils);
