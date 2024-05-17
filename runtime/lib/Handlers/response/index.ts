import { CompiledResponseNode, NodeType, ResponseVariantType, VersionProgramResources } from '@voiceflow/dtos';

import { addOutputTrace, textOutputTrace } from '@/lib/services/runtime/utils';
import { HandlerFactory } from '@/runtime/lib/Handler';

const handlerUtils = {
  addOutputTrace,
  textOutputTrace,
};

export const ResponseHandler: HandlerFactory<CompiledResponseNode, typeof handlerUtils> = (utils) => ({
  canHandle: (node) => node.type === NodeType.RESPONSE,

  handle: async (node, runtime, variables): Promise<string | null> => {
    const { programResources } = runtime.version as any;
    const { responses } = programResources;
    const responseData = responses[node.data.responseID];
    const defaultDiscriminator = 'default:en-us';
    const variants = responseData.variants[defaultDiscriminator];

    variants?.forEach((val) => {
      if (val.type === ResponseVariantType.TEXT) {
        const trace = utils.textOutputTrace({
          output: val.data.text,
        });

        utils.addOutputTrace(runtime, trace, { node, variables });
      }
    });

    if (!variants) {
      throw new Error(`[response-handler]: could not resolve response step, missing variants fors 'default:en-us'`);
    }

    return node.ports.default;
  },
});

export default () => ResponseHandler(handlerUtils);
