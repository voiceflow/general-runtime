import { BaseNode } from '@voiceflow/base-types';
import {
  Channel,
  CompiledMessageNode,
  CompiledMessageNodeDTO,
  CompiledResponseMessage,
  Language,
  Version,
} from '@voiceflow/dtos';

import { HandlerFactory, Runtime, Store } from '@/runtime';

import { addOutputTrace, textOutputTrace } from '../../utils';
import { createCondition } from './lib/conditions/condition';
import { selectDiscriminator } from './lib/selectDiscriminator';
import { selectVariant } from './lib/selectVariant';

const MESSAGE_HANDLER_ERROR_TAG = 'message-handler';

function outputVariant(
  variant: CompiledResponseMessage,
  node: CompiledMessageNode,
  runtime: Runtime,
  variables: Store
) {
  const trace = textOutputTrace({
    output: variant.data.text.content,
    ...(variant.data.delay && { delay: variant.data.delay }),
    variables,
    version: runtime.version,
  });

  addOutputTrace(runtime, trace, { node, variables });
}

function getResponse(runtime: Runtime, messageID: string) {
  if (!runtime.version) {
    throw new Error(`[${MESSAGE_HANDLER_ERROR_TAG}]: Runtime was not loaded with a version`);
  }

  /**
   * !TODO! - Need to replace this `as Version` cast by refactoring `general-runtime` to use the
   *          `Version` from the DTOs.
   */
  const version = runtime.version as unknown as Version;

  if (!version.programResources) {
    throw new Error(`[${MESSAGE_HANDLER_ERROR_TAG}]: Version was not compiled`);
  }

  return version.programResources.messages[messageID];
}

export const MessageHandler: HandlerFactory<CompiledMessageNode> = () => ({
  canHandle: (node) => CompiledMessageNodeDTO.safeParse(node).success,

  handle: async (node, runtime, variables): Promise<string | null> => {
    runtime.trace.debug('__response__ - entered', node.type as BaseNode.NodeType);

    const message = getResponse(runtime, node.data.messageID);

    const currentLanguage = Language.ENGLISH_US;
    const currentChannel = Channel.DEFAULT;
    const chosenDiscriminator = selectDiscriminator(message, currentChannel, currentLanguage);

    if (!chosenDiscriminator) {
      throw new Error(
        `[${MESSAGE_HANDLER_ERROR_TAG}]: could not resolve response step, missing variants list for channel='${currentChannel}', language='${currentLanguage}'`
      );
    }

    const preprocessedVariants = chosenDiscriminator.map((variant) => ({
      variant,
      conditions: variant.conditions?.map((cond) => createCondition(cond, runtime, variables)),
    }));
    const chosenVariant = selectVariant(preprocessedVariants);

    outputVariant(chosenVariant, node, runtime, variables);

    return node.ports.default;
  },
});

export default () => MessageHandler();
