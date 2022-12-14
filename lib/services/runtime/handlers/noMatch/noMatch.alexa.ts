import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';

import { NoMatchCounterStorage, StorageType } from '../../types';
import { outputTrace, removeEmptyPrompts } from '../../utils';
import { addRepromptIfExists, getGlobalNoMatchPrompt } from '../../utils.alexa';
import { convertDeprecatedNoMatch } from './noMatch';

const getOutput = (
  runtime: Runtime,
  node: VoiceflowNode.Utils.NoMatchNode,
  noMatchCounter: number,
  variables: Store
) => {
  const noMatchPrompts = removeEmptyPrompts(node.noMatch?.prompts ?? []);

  const exhaustedReprompts = noMatchCounter >= noMatchPrompts.length;
  const sanitizedVars = sanitizeVariables(variables.getState());
  const globalNoMatchPrompt = getGlobalNoMatchPrompt(runtime);

  if (exhaustedReprompts) {
    return replaceVariables(globalNoMatchPrompt?.content, sanitizedVars);
  }

  const speak = (node.noMatch?.randomize ? _.sample(noMatchPrompts) : noMatchPrompts?.[noMatchCounter]) || '';
  return replaceVariables(speak as string, sanitizedVars);
};

export const NoMatchAlexaHandler = () => ({
  handle: (_node: VoiceflowNode.Utils.NoMatchNode, runtime: Runtime, variables: Store) => {
    const node = convertDeprecatedNoMatch(_node);
    const noMatchCounter = runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER) ?? 0;

    const output = getOutput(runtime, node, noMatchCounter, variables);

    if (!output) {
      // clean up no matches counter
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
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
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
      return node.noMatch.nodeID;
    }

    runtime.storage.set(StorageType.NO_MATCHES_COUNTER, noMatchCounter + 1);
    addRepromptIfExists({ node: _node, runtime, variables });

    return node.id;
  },
});

export default () => NoMatchAlexaHandler();
