import { BaseNode, BaseRequest, BaseText, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';

import { NoMatchCounterStorage, StorageType } from '../types';
import {
  addButtonsIfExists,
  getGlobalNoMatchPrompt,
  isPromptContentEmpty,
  outputTrace,
  removeEmptyPrompts,
} from '../utils';
import { addNoReplyTimeoutIfExists } from './noReply';

export type NoMatchNode = BaseRequest.NodeButton & VoiceflowNode.Utils.NoMatchNode;

const utilsObj = {
  outputTrace,
  addButtonsIfExists,
  addNoReplyTimeoutIfExists,
};

const convertDeprecatedNoMatch = ({ noMatch, elseId, noMatches, randomize, ...node }: NoMatchNode) =>
  ({
    noMatch: {
      prompts: noMatch?.prompts ?? noMatches,
      randomize: noMatch?.randomize ?? randomize,
      nodeID: noMatch?.nodeID ?? elseId,
    },
    ...node,
  } as NoMatchNode);

const removeEmptyNoMatches = (node: NoMatchNode) => {
  const prompts: Array<BaseText.SlateTextValue | string> = node.noMatch?.prompts ?? [];

  return removeEmptyPrompts(prompts);
};

const getOutput = (node: NoMatchNode, runtime: Runtime, noMatchCounter: number) => {
  const nonEmptyNoMatches = removeEmptyNoMatches(node);
  const globalNoMatchPrompt = getGlobalNoMatchPrompt(runtime);
  const exhaustedReprompts = noMatchCounter >= nonEmptyNoMatches.length;

  if (!exhaustedReprompts) {
    return node.noMatch?.randomize
      ? _.sample<string | BaseText.SlateTextValue>(nonEmptyNoMatches)
      : nonEmptyNoMatches[noMatchCounter];
  }

  if (!isPromptContentEmpty(globalNoMatchPrompt?.content)) {
    return globalNoMatchPrompt?.content;
  }

  return null;
};

export const NoMatchHandler = (utils: typeof utilsObj) => ({
  handle: (_node: NoMatchNode, runtime: Runtime, variables: Store) => {
    const node = convertDeprecatedNoMatch(_node);
    const noMatchCounter = runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER) ?? 0;
    const output = getOutput(node, runtime, noMatchCounter);

    if (!output) {
      // clean up no matches counter
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);

      runtime.trace.addTrace<BaseTrace.PathTrace>({
        type: BaseNode.Utils.TraceType.PATH,
        payload: { path: 'choice:else' },
      });

      return node.noMatch?.nodeID ?? null;
    }

    runtime.trace.addTrace<BaseTrace.PathTrace>({
      type: BaseNode.Utils.TraceType.PATH,
      payload: { path: 'reprompt' },
    });

    utils.outputTrace({
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

    utils.addButtonsIfExists(node, runtime, variables);
    utils.addNoReplyTimeoutIfExists(node, runtime);
    return node.id;
  },
});

export default () => NoMatchHandler(utilsObj);
