import { BaseNode } from '@voiceflow/api-sdk';
import { Request, Text } from '@voiceflow/base-types';
import { Node as ChatNode } from '@voiceflow/chat-types';
import { Node as VoiceNode } from '@voiceflow/voice-types';
import _ from 'lodash';

import { HandlerFactory, Runtime, Store } from '@/runtime';

import { NoMatchCounterStorage, StorageData, StorageType } from '../types';
import { addButtonsIfExists, outputTrace, slateToPlaintext } from '../utils';

interface BaseNoMatchNode extends BaseNode, Request.NodeButton {}
interface VoiceNoMatchNode extends BaseNoMatchNode, VoiceNode.Utils.NodeNoMatch {}
interface ChatNoMatchNode extends BaseNoMatchNode, ChatNode.Utils.NodeNoMatch {}

export type NoMatchNode = VoiceNoMatchNode | ChatNoMatchNode;

export const EMPTY_AUDIO_STRING = '<audio src=""/>';

const utilsObj = {
  outputTrace,
  addButtonsIfExists,
};

const removeEmptyNoMatches = <T extends string[] | Text.SlateTextValue[]>(noMatchArray?: T): T | undefined =>
  (noMatchArray as any[])?.filter(
    (noMatch: T[number]) => noMatch != null && (_.isString(noMatch) ? noMatch !== EMPTY_AUDIO_STRING : !!slateToPlaintext(noMatch))
  ) as T | undefined;

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

    const nonEmptyNoMatches = removeEmptyNoMatches(node.noMatches)!;

    const output = node.randomize
      ? _.sample<string | Text.SlateTextValue>(nonEmptyNoMatches)
      : nonEmptyNoMatches?.[runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER)! - 1];

    runtime.trace.addTrace(utils.outputTrace({ output, variables: variables.getState() }));

    utils.addButtonsIfExists(node, runtime, variables);

    return node.id;
  },
});

export default () => NoMatchHandler(utilsObj);
