import { Node as BaseNode, Request, Text, Trace } from '@voiceflow/base-types';
import { Node as ChatNode } from '@voiceflow/chat-types';
import { Node as VoiceNode } from '@voiceflow/voice-types';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';

import { NoMatchCounterStorage, StorageType } from '../types';
import { addButtonsIfExists, outputTrace, removeEmptyPrompts } from '../utils';

type NoMatchNode = Request.NodeButton & (VoiceNode.Utils.NoMatchNode | ChatNode.Utils.NoMatchNode);

const utilsObj = {
  outputTrace,
  addButtonsIfExists,
};

const removeEmptyNoMatches = (node: NoMatchNode) => {
  const prompts: Array<Text.SlateTextValue | string> = node.noMatch?.prompts ?? node.noMatches ?? [];

  return removeEmptyPrompts(prompts);
};

const getNoMatchID = (node: NoMatchNode) => node.noMatch?.nodeID ?? node.elseId ?? null;

export const NoMatchHandler = (utils: typeof utilsObj) => ({
  handle: (node: NoMatchNode, runtime: Runtime, variables: Store) => {
    const nonEmptyNoMatches = removeEmptyNoMatches(node);

    const noMatchCounter = runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER) ?? 0;

    if (noMatchCounter >= nonEmptyNoMatches.length) {
      // clean up no matches counter
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);

      runtime.trace.addTrace<Trace.PathTrace>({
        type: BaseNode.Utils.TraceType.PATH,
        payload: { path: 'choice:else' },
      });

      return getNoMatchID(node);
    }

    runtime.storage.set(StorageType.NO_MATCHES_COUNTER, noMatchCounter + 1);

    runtime.trace.addTrace<Trace.PathTrace>({
      type: BaseNode.Utils.TraceType.PATH,
      payload: { path: 'reprompt' },
    });

    const output =
      node.noMatch?.randomize ?? node.randomize
        ? _.sample<string | Text.SlateTextValue>(nonEmptyNoMatches)
        : nonEmptyNoMatches?.[runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER)! - 1];

    runtime.trace.addTrace(utils.outputTrace({ output, variables: variables.getState() }));

    utils.addButtonsIfExists(node, runtime, variables);

    return node.id;
  },
});

export default () => NoMatchHandler(utilsObj);
