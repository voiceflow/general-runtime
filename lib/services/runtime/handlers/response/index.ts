import { CompiledResponseNode, NodeType, ResponseVariantType, Version } from '@voiceflow/dtos';

import { HandlerFactory } from '@/runtime';

import { addOutputTrace, textOutputTrace } from '../../utils';

const handlerUtils = {
  addOutputTrace,
  textOutputTrace,
};

const RESPONSE_HANDLER_ERROR_TAG = 'response-handler';

const DEFAULT_DISCRIMINATOR = 'default:en-us';

export const ResponseHandler: HandlerFactory<CompiledResponseNode, typeof handlerUtils> = (utils) => ({
  canHandle: (node) => node.type === NodeType.RESPONSE,

  handle: async (node, runtime, variables): Promise<string | null> => {
    if (!runtime.version) {
      throw new Error(`[${RESPONSE_HANDLER_ERROR_TAG}]: Runtime was not loaded with a version`);
    }
    /**
     * !TODO! - Need to replace this `as Version` cast by refactoring `general-runtime` to use the
     *          `Version` from the DTOs.
     */
    const version = runtime.version as Version;

    if (!version.programResources) {
      throw new Error(`[${RESPONSE_HANDLER_ERROR_TAG}]: Version was not compiled`);
    }
    const { responses } = version.programResources;

    const responseData = responses[node.data.responseID];

    const variants = responseData.variants[DEFAULT_DISCRIMINATOR];

    if (!variants) {
      throw new Error(
        `[${RESPONSE_HANDLER_ERROR_TAG}]: could not resolve response step, missing variants list for '${DEFAULT_DISCRIMINATOR}'`
      );
    }

    variants.forEach((val) => {
      if (val.type === ResponseVariantType.TEXT) {
        const trace = utils.textOutputTrace({
          output: val.data.text,
          ...(val.data.speed && { delay: val.data.speed }),
          variables,
          version: runtime.version,
        });

        utils.addOutputTrace(runtime, trace, { node, variables });
      }
    });

    return node.ports.default;
  },
});

export default () => ResponseHandler(handlerUtils);
