import { BaseNode } from '@voiceflow/api-sdk';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { NodeWithButtons, NodeWithNoMatches, TraceType } from '@voiceflow/general-types';
import { SpeakType, TraceFrame } from '@voiceflow/general-types/build/nodes/speak';
import _ from 'lodash';

import { HandlerFactory, Runtime, Store } from '@/runtime';

import { NoMatchCounterStorage, StorageData, StorageType } from '../types';
import { addButtonsIfExists } from '../utils';

export interface NoMatchNode extends BaseNode, NodeWithButtons, NodeWithNoMatches {}

export const EMPTY_AUDIO_STRING = '<audio src=""/>';

const utilsObj = {
  addButtonsIfExists,
};

const removeEmptyNoMatches = (noMatchArray?: string[]) => noMatchArray?.filter((noMatch) => noMatch != null && noMatch !== EMPTY_AUDIO_STRING);

export const NoMatchHandler: HandlerFactory<NoMatchNode, typeof utilsObj> = (utils) => ({
  canHandle: (node: NoMatchNode, runtime: Runtime) => {
    const nonEmptyNoMatches = removeEmptyNoMatches(node.noMatches);

    return (
      Array.isArray(nonEmptyNoMatches) && nonEmptyNoMatches.length > (runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER) ?? 0)
    );
  },
  handle: (node: NoMatchNode, runtime: Runtime, variables: Store) => {
    runtime.storage.produce<StorageData>((draft) => {
      const counter = draft[StorageType.NO_MATCHES_COUNTER];

      draft[StorageType.NO_MATCHES_COUNTER] = counter ? counter + 1 : 1;
    });

    runtime.trace.addTrace<any>({
      type: 'path',
      payload: { path: 'reprompt' },
    });

    const nonEmptyNoMatches = removeEmptyNoMatches(node.noMatches);
    const speak =
      (node.randomize
        ? _.sample(nonEmptyNoMatches)
        : nonEmptyNoMatches?.[runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER)! - 1]) || '';

    const sanitizedVars = sanitizeVariables(variables.getState());
    const output = replaceVariables(speak, sanitizedVars);

    runtime.storage.produce<StorageData>((draft) => {
      draft[StorageType.OUTPUT] += output;
    });
    runtime.trace.addTrace<TraceFrame>({
      type: TraceType.SPEAK,
      payload: { message: output, type: SpeakType.MESSAGE },
    });

    utils.addButtonsIfExists(node, runtime, variables);

    return node.id;
  },
});

export default () => NoMatchHandler(utilsObj);
