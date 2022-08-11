import { BaseNode } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';
import { Storage } from '@/runtime/lib/constants/flags.alexa';

import { NoMatchCounterStorage } from '../../types';
import { addRepromptIfExists } from '../../utils.alexa';
import { convertDeprecatedNoMatch, removeEmptyNoMatches } from './noMatch';

export const NoMatchHandler = () => ({
  handle: (_node: VoiceflowNode.Utils.NoMatchNode, runtime: Runtime, variables: Store) => {
    const node = convertDeprecatedNoMatch(_node);
    const noMatchPrompts = removeEmptyNoMatches(node);

    const noMatchCounter = runtime.storage.get<NoMatchCounterStorage>(Storage.NO_MATCHES_COUNTER) ?? 0;

    if (noMatchCounter >= noMatchPrompts.length) {
      // clean up no matches counter
      runtime.storage.delete(Storage.NO_MATCHES_COUNTER);
      return node.noMatch?.nodeID ?? null;
    }

    runtime.storage.set(Storage.NO_MATCHES_COUNTER, noMatchCounter + 1);

    const speak = (node.noMatch?.randomize ? _.sample(noMatchPrompts) : noMatchPrompts?.[noMatchCounter]) || '';
    if (typeof speak !== 'string') return node.id;

    const sanitizedVars = sanitizeVariables(variables.getState());
    const output = replaceVariables(speak, sanitizedVars);

    addRepromptIfExists({ node: _node, runtime, variables });

    runtime.storage.produce((draft) => {
      draft[Storage.OUTPUT] += output;
    });

    runtime.trace.addTrace<BaseNode.Speak.TraceFrame>({
      type: BaseNode.Utils.TraceType.SPEAK,
      payload: { message: output, type: BaseNode.Speak.TraceSpeakType.MESSAGE },
    });

    return node.id;
  },
});

export default () => NoMatchHandler();
