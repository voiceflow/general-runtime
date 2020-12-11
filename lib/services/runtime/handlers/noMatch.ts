import { Node } from '@voiceflow/api-sdk';
import { TraceType } from '@voiceflow/general-types';
import { TraceFrame } from '@voiceflow/general-types/build/nodes/speak';
import { Context, replaceVariables, sanitizeVariables, Store } from '@voiceflow/runtime';
import _ from 'lodash';

import { NoMatchCounterStorage, StorageData, StorageType } from '../types';

type NoMatchNode = Node<any, { noMatches?: string[]; randomize?: boolean }>;

export const EMPTY_AUDIO_STRING = '<audio src=""/>';

const removeEmptyNoMatches = (noMatchArray?: string[]) => noMatchArray?.filter((noMatch) => noMatch != null && noMatch !== EMPTY_AUDIO_STRING);

export const NoMatchHandler = () => ({
  canHandle: (node: NoMatchNode, context: Context) => {
    const nonEmptyNoMatches = removeEmptyNoMatches(node.noMatches);

    return (
      Array.isArray(nonEmptyNoMatches) && nonEmptyNoMatches.length > (context.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER) ?? 0)
    );
  },
  handle: (node: NoMatchNode, context: Context, variables: Store) => {
    context.storage.produce<StorageData>((draft) => {
      const counter = draft[StorageType.NO_MATCHES_COUNTER];

      draft[StorageType.NO_MATCHES_COUNTER] = counter ? counter + 1 : 1;
    });

    const nonEmptyNoMatches = removeEmptyNoMatches(node.noMatches);
    const speak =
      (node.randomize
        ? _.sample(nonEmptyNoMatches)
        : nonEmptyNoMatches?.[context.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER)! - 1]) || '';

    const sanitizedVars = sanitizeVariables(variables.getState());
    const output = replaceVariables(speak, sanitizedVars);

    context.storage.produce<StorageData>((draft) => {
      draft[StorageType.OUTPUT] += output;
    });

    context.trace.addTrace<TraceFrame>({
      type: TraceType.SPEAK,
      payload: { message: output },
    });

    return node.id;
  },
});

export default () => NoMatchHandler();
