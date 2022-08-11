import { VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';
import { Storage } from '@/runtime/lib/constants/flags.google';

import { NoMatchCounterStorage } from '../../types';
import { removeEmptyPrompts } from '../../utils';
import { processOutput } from '../../utils.google';
import { convertDeprecatedNoMatch } from './noMatch';

export const NoMatchHandler = () => ({
  handle: (_node: VoiceflowNode.Utils.NoMatchNode, runtime: Runtime, variables: Store) => {
    const node = convertDeprecatedNoMatch(_node);
    const noMatchPrompts = removeEmptyPrompts(node?.noMatch?.prompts ?? []);

    const noMatchCounter = runtime.storage.get<NoMatchCounterStorage>(Storage.NO_MATCHES_COUNTER) ?? 0;

    if (noMatchCounter >= noMatchPrompts.length) {
      // clean up no matches counter
      runtime.storage.delete(Storage.NO_MATCHES_COUNTER);
      return node.noMatch?.nodeID ?? null;
    }

    runtime.storage.set(Storage.NO_MATCHES_COUNTER, noMatchCounter + 1);

    const speak = node.noMatch?.randomize ? _.sample(noMatchPrompts) : noMatchPrompts?.[noMatchCounter];
    const output = processOutput(speak, variables);

    runtime.storage.produce((draft) => {
      draft[Storage.OUTPUT] += output;
    });

    return node.id;
  },
});

export default () => NoMatchHandler();
