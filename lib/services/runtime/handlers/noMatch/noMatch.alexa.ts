/**
 * Alexa no match needs to be used in favor of general command because
 * in case of a no match with nothing to output we want to reprompt with the no reply instead
 */
import { VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Runtime, Store } from '@/runtime';

import { NoMatchCounterStorage, StorageType } from '../../types';
import { addRepromptIfExists, outputTrace } from '../../utils';
import { convertDeprecatedNoMatch, getOutput } from '.';

export const NoMatchAlexaHandler = () => ({
  handle: async (_node: VoiceflowNode.Utils.NoMatchNode, runtime: Runtime, variables: Store) => {
    const node = convertDeprecatedNoMatch(_node);
    const noMatchCounter = runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER) ?? 0;

    const output = await getOutput(node, runtime, noMatchCounter);

    if (!output) {
      // clean up no matches counter
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
      return node.noMatch?.nodeID ?? null;
    }

    outputTrace({
      addTrace: runtime.trace.addTrace.bind(runtime.trace),
      debugLogging: runtime.debugLogging,
      node,
      output: output.output,
      variables,
    });

    if (node.noMatch?.nodeID) {
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
      return node.noMatch.nodeID;
    }

    runtime.storage.set(StorageType.NO_MATCHES_COUNTER, noMatchCounter + 1);
    addRepromptIfExists(_node, runtime, variables);

    return node.id;
  },
});

export default () => NoMatchAlexaHandler();
