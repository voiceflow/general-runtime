import { BaseNode } from '@voiceflow/api-sdk';
import { Node, Request, Text, Trace } from '@voiceflow/base-types';
import { Node as ChatNode } from '@voiceflow/chat-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { Node as VoiceNode } from '@voiceflow/voice-types';
import cuid from 'cuid';
import _ from 'lodash';

import { HandlerFactory, Runtime, Store } from '@/runtime';

import { NoMatchCounterStorage, StorageData, StorageType } from '../types';
import { addButtonsIfExists, slateInjectVariables, slateToPlaintext } from '../utils';

interface BaseNoMatchNode extends BaseNode, Request.NodeButton {}
interface VoiceNoMatchNode extends BaseNoMatchNode, VoiceNode.Utils.NodeNoMatch {}
interface ChatNoMatchNode extends BaseNoMatchNode, ChatNode.Utils.NodeNoMatch {}

export type NoMatchNode = VoiceNoMatchNode | ChatNoMatchNode;

export const EMPTY_AUDIO_STRING = '<audio src=""/>';

const utilsObj = {
  slateToPlaintext,
  addButtonsIfExists,
  slateInjectVariables,
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

    const noMatch = node.randomize
      ? _.sample<string | Text.SlateTextValue>(nonEmptyNoMatches)
      : nonEmptyNoMatches?.[runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER)! - 1];

    const sanitizedVars = sanitizeVariables(variables.getState());

    if (noMatch && Array.isArray(noMatch)) {
      const content = utils.slateInjectVariables(noMatch, sanitizedVars);
      const message = utils.slateToPlaintext(content);

      runtime.storage.produce<StorageData>((draft) => {
        const draftOutput = draft[StorageType.OUTPUT] || '';

        draft[StorageType.OUTPUT] = [...(Array.isArray(draftOutput) ? draftOutput : [{ children: [{ text: draftOutput }] }]), ...content];
      });

      runtime.trace.addTrace<Trace.TextTrace>({
        type: Node.Utils.TraceType.TEXT,
        payload: { slate: { id: cuid.slug(), content }, message },
      });
    } else {
      const output = replaceVariables(noMatch || '', sanitizedVars);

      runtime.storage.produce<StorageData>((draft) => {
        const draftOutput = draft[StorageType.OUTPUT] || '';

        draft[StorageType.OUTPUT] = `${Array.isArray(draftOutput) ? utils.slateToPlaintext(draftOutput) : draftOutput}${output}`;
      });

      runtime.trace.addTrace<Trace.SpeakTrace>({
        type: Node.Utils.TraceType.SPEAK,
        payload: { message: output, type: Node.Speak.TraceSpeakType.MESSAGE },
      });
    }

    utils.addButtonsIfExists(node, runtime, variables);

    return node.id;
  },
});

export default () => NoMatchHandler(utilsObj);
