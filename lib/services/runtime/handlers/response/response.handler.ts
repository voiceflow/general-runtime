import { BaseNode } from '@voiceflow/base-types';
import {
  AnyCompiledResponseVariant,
  CompiledResponseNode,
  CompiledResponseNodeDTO,
  Language,
  ResponseVariantType,
  Version,
} from '@voiceflow/dtos';

import { HandlerFactory, Runtime, Store } from '@/runtime';

import { addOutputTrace, textOutputTrace } from '../../utils';
import { Channel } from './lib/channel.enum';
import { createCondition } from './lib/conditions/condition';
import { selectDiscriminator } from './lib/selectDiscriminator';
import { selectVariant } from './lib/selectVariant';

const RESPONSE_HANDLER_ERROR_TAG = 'response-handler';

function outputVariant(
  variant: AnyCompiledResponseVariant,
  node: CompiledResponseNode,
  runtime: Runtime,
  variables: Store
) {
  if (variant.type === ResponseVariantType.TEXT) {
    const trace = textOutputTrace({
      output: variant.data.text,
      ...(variant.data.speed && { delay: variant.data.speed }),
      variables,
      version: runtime.version,
    });

    addOutputTrace(runtime, trace, { node, variables });
  }
}

function getResponse(runtime: Runtime, responseID: string) {
  if (!runtime.version) {
    throw new Error(`[${RESPONSE_HANDLER_ERROR_TAG}]: Runtime was not loaded with a version`);
  }

  /**
   * !TODO! - Need to replace this `as Version` cast by refactoring `general-runtime` to use the
   *          `Version` from the DTOs.
   */
  const version = runtime.version as unknown as Version;

  if (!version.programResources) {
    throw new Error(`[${RESPONSE_HANDLER_ERROR_TAG}]: Version was not compiled`);
  }

  return version.programResources.responses[responseID];
}

export const ResponseHandler: HandlerFactory<CompiledResponseNode> = () => ({
  canHandle: (node) => CompiledResponseNodeDTO.safeParse(node).success,

  handle: async (node, runtime, variables): Promise<string | null> => {
    runtime.trace.debug('__response__ - entered', node.type as BaseNode.NodeType);

    const responses = getResponse(runtime, node.data.responseID);

    const currentLanguage = Language.ENGLISH_US;
    const currentChannel = Channel.DEFAULT;
    const chosenDiscriminator = selectDiscriminator(responses, currentChannel, currentLanguage);

    if (!chosenDiscriminator) {
      throw new Error(
        `[${RESPONSE_HANDLER_ERROR_TAG}]: could not resolve response step, missing variants list for channel='${currentChannel}', language='${currentLanguage}'`
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

export default () => ResponseHandler();
