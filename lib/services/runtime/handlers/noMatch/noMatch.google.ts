import { VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';
import { Storage } from '@/runtime/lib/constants/flags.google';

import { NoMatchCounterStorage } from '../../types';
import { isPromptContentEmpty, outputTrace, removeEmptyPrompts } from '../../utils';
import { getGlobalNoMatchPrompt, processOutput } from '../../utils.google';
import { convertDeprecatedNoMatch } from './noMatch';

const getOutput = (
  runtime: Runtime,
  node: VoiceflowNode.Utils.NoMatchNode,
  variables: Store,
  noMatchCounter: number
) => {
  const nonEmptyNoMatches = removeEmptyPrompts(node?.noMatch?.prompts ?? []);

  const exhaustedReprompts = noMatchCounter >= nonEmptyNoMatches.length;

  if (!exhaustedReprompts) {
    const speak = node.noMatch?.randomize ? _.sample(nonEmptyNoMatches) : nonEmptyNoMatches?.[noMatchCounter];
    return processOutput(speak, variables);
  }

  const globalNoMatchPrompt = getGlobalNoMatchPrompt(runtime)?.content;

  if (!isPromptContentEmpty(globalNoMatchPrompt)) {
    return processOutput(globalNoMatchPrompt, variables);
  }

  return null;
};

export const NoMatchGoogleHandler = () => ({
  handle: (_node: VoiceflowNode.Utils.NoMatchNode, runtime: Runtime, variables: Store) => {
    const node = convertDeprecatedNoMatch(_node);
    const noMatchCounter = runtime.storage.get<NoMatchCounterStorage>(Storage.NO_MATCHES_COUNTER) ?? 0;
    const output = getOutput(runtime, node, variables, noMatchCounter);

    if (!output) {
      // clean up no matches counter
      runtime.storage.delete(Storage.NO_MATCHES_COUNTER);
      return node.noMatch?.nodeID ?? null;
    }

    outputTrace({
      addTrace: runtime.trace.addTrace.bind(runtime.trace),
      debugLogging: runtime.debugLogging,
      node,
      output,
      variables: variables.getState(),
    });

    if (node.noMatch?.nodeID) {
      runtime.storage.delete(Storage.NO_MATCHES_COUNTER);
      return node.noMatch.nodeID;
    }

    runtime.storage.set(Storage.NO_MATCHES_COUNTER, noMatchCounter + 1);

    return node.id;
  },
});

export default () => NoMatchGoogleHandler();
