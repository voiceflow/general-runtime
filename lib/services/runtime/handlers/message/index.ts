import { CompiledMessageNode, CompiledMessageNodeDTO, Version } from '@voiceflow/dtos';

import { HandlerFactory } from '@/runtime';

import { addOutputTrace, textOutputTrace } from '../../utils';

const handlerUtils = {
  addOutputTrace,
  textOutputTrace,
};

const MESSAGE_HANDLER_ERROR_TAG = 'message-handler';

const DEFAULT_DISCRIMINATOR = 'default:en-us';

export const MessageHandler: HandlerFactory<CompiledMessageNode, typeof handlerUtils> = (utils) => ({
  canHandle: (node) => CompiledMessageNodeDTO.safeParse(node).success,

  handle: async (node, runtime, variables): Promise<string | null> => {
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
    const msg = version.programResources.messages[node.data.messageID];
    const variants = msg.variants[DEFAULT_DISCRIMINATOR];

    if (!variants) {
      throw new Error(
        `[${MESSAGE_HANDLER_ERROR_TAG}]: could not resolve message step, missing variants list for '${DEFAULT_DISCRIMINATOR}'`
      );
    }

    variants.forEach((val) => {
      const trace = utils.textOutputTrace({
        output: val.data?.text,
        ...(val.data?.delay && { delay: val.data.delay }),
        variables,
        version: runtime.version,
      });

      utils.addOutputTrace(runtime, trace, { node, variables });
    });

    return node.ports.default;
  },
});

export default () => MessageHandler(handlerUtils);
