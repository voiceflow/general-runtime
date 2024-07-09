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
import { raiseMessageHandlerError } from './lib/utils';

function outputVariant(
  variant: CompiledResponseMessage,
  node: CompiledMessageNode,
  runtime: Runtime,
  variables: Store
) {
  const trace = textOutputTrace({
    output: variant.data.text,
    ...(variant.data.delay && { delay: variant.data.delay }),
    variables,
    version: runtime.version,
  });

  addOutputTrace(runtime, trace, { node, variables });
}

function getMessageData(runtime: Runtime, messageID: string) {
  if (!runtime.version) {
    throw raiseMessageHandlerError('Runtime was not loaded with a version');
  }

  /**
   * !TODO! - Need to replace this `as Version` cast by refactoring `general-runtime` to use the
   *          `Version` from the DTOs.
   */
  const version = runtime.version as unknown as Version;

  if (!version.programResources) {
    throw raiseMessageHandlerError('Version was not compiled');
  }

  return version.programResources.messages[messageID];
}

export const MessageHandler: HandlerFactory<CompiledMessageNode> = () => ({
  canHandle: (node) => CompiledMessageNodeDTO.safeParse(node).success,

  handle: async (node, runtime, variables): Promise<string | null> => {
    try {
      const message = getMessageData(runtime, node.data.messageID);

      const currentLanguage = Language.ENGLISH_US;
      const currentChannel = Channel.DEFAULT;
      const chosenDiscriminator = selectDiscriminator(message, currentChannel, currentLanguage);

      if (!chosenDiscriminator) {
        throw raiseMessageHandlerError(
          `could not resolve response step, missing variants list for channel='${currentChannel}', language='${currentLanguage}'`
        );
      }

      const logMessage = (message: string) => runtime.trace.debug(message);
      const preprocessedVariants = chosenDiscriminator.map((variant) => ({
        variant,
        condition: variant.condition ? createCondition(variant.condition, variables.getState(), logMessage) : null,
      }));

      const chosenVariant = await selectVariant(preprocessedVariants);

      if (chosenVariant.data.text.trim()) {
        outputVariant(chosenVariant, node, runtime, variables);
      }

      return node.ports.default;
    } catch (err) {
      const prefix = `message step execution for versionID="${runtime.versionID}" failed due to `;
      const suffix =
        err instanceof Error
          ? `error = "${err.message}"`
          : `unknown error, recovered details = "${JSON.stringify(err, null, 2).substring(0, 300)}"`;
      const errorMessage = prefix + suffix;

      runtime.trace.debug(errorMessage);

      throw raiseMessageHandlerError(errorMessage);
    }
  },
});

export default () => MessageHandler();
