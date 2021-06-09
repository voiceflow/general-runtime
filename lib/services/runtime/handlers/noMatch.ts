import { BaseNode } from '@voiceflow/api-sdk';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { EventType, IntentEvent, IntentRequestButton, RequestType, TraceType } from '@voiceflow/general-types';
import { Node as ChoiceNode, TraceFrame as ChoiceTrace } from '@voiceflow/general-types/build/nodes/interaction';
import { SpeakType, TraceFrame } from '@voiceflow/general-types/build/nodes/speak';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';

import { NoMatchCounterStorage, StorageData, StorageType } from '../types';

export interface NoMatchNode extends BaseNode, Partial<Pick<ChoiceNode, 'noMatches' | 'interactions'>> {
  randomize?: boolean;
}

export const EMPTY_AUDIO_STRING = '<audio src=""/>';

const removeEmptyNoMatches = (noMatchArray?: string[]) => noMatchArray?.filter((noMatch) => noMatch != null && noMatch !== EMPTY_AUDIO_STRING);

export const NoMatchHandler = () => ({
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

    if (Array.isArray(node.interactions)) {
      runtime.trace.addTrace<ChoiceTrace>({
        type: TraceType.CHOICE,
        payload: {
          buttons: node.interactions.reduce<IntentRequestButton[]>((acc, interaction) => {
            if (interaction.event?.type === EventType.INTENT) {
              const { intent } = interaction.event as IntentEvent;

              return [
                ...acc,
                {
                  name: '', // will be filled in the buttons service
                  request: {
                    type: RequestType.INTENT,
                    payload: {
                      query: '',
                      intent: { name: intent },
                      entities: [],
                    },
                  },
                },
              ];
            }

            return acc;
          }, []),
        },
      });
    }

    return node.id;
  },
});

export default () => NoMatchHandler();
