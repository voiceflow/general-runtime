import { BaseNode, BaseRequest, BaseText, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';

import { NoMatchCounterStorage, Output, StorageType } from '../../types';
import {
  addButtonsIfExists,
  getGlobalNoMatchPrompt,
  isPromptContentEmpty,
  isPromptContentInitialyzed,
  outputTrace,
  removeEmptyPrompts,
} from '../../utils';
import { addNoReplyTimeoutIfExists } from '../noReply';
import { generateNoMatch } from '../utils/generativeNoMatch';
import { generateOutput } from '../utils/output';

export type NoMatchNode = BaseRequest.NodeButton & VoiceflowNode.Utils.NoMatchNode;

const utilsObj = {
  outputTrace,
  addButtonsIfExists,
  addNoReplyTimeoutIfExists,
};

export const convertDeprecatedNoMatch = ({ noMatch, elseId, noMatches, randomize, ...node }: NoMatchNode) =>
  ({
    noMatch: {
      prompts: noMatch?.prompts ?? noMatches,
      randomize: noMatch?.randomize ?? randomize,
      nodeID: noMatch?.nodeID ?? elseId,
    },
    ...node,
  } as NoMatchNode);

export const removeEmptyNoMatches = (node: NoMatchNode) => {
  const prompts: Array<BaseText.SlateTextValue | string> = node.noMatch?.prompts ?? [];

  return removeEmptyPrompts(prompts);
};

export const getOutput = async (
  node: NoMatchNode,
  runtime: Runtime,
  noMatchCounter: number
): Promise<{ output: Output; ai?: boolean } | void | null> => {
  const nonEmptyNoMatches = removeEmptyNoMatches(node);
  const globalNoMatchPrompt = getGlobalNoMatchPrompt(runtime);
  const exhaustedReprompts = noMatchCounter >= nonEmptyNoMatches.length;

  if (!exhaustedReprompts) {
    const output = node.noMatch?.randomize
      ? _.sample<string | BaseText.SlateTextValue>(nonEmptyNoMatches)
      : nonEmptyNoMatches[noMatchCounter];

    if (output) return { output };
  }

  // if we have exhausted reprompts AND there is a following action,
  // we should not continue prompting
  if (node.noMatch?.nodeID) {
    return null;
  }

  if (
    /** @deprecated use  generateNoMatch instead after migration */
    runtime.project?.aiAssistSettings?.freestyle === true ||
    runtime.project?.aiAssistSettings?.generateNoMatch === true
  ) {
    const output = await generateNoMatch(runtime);

    if (output) return { output, ai: true };
  }

  // if user never set global no-match prompt, we should use default
  if (!isPromptContentInitialyzed(globalNoMatchPrompt?.content)) {
    return {
      output: generateOutput(VoiceflowConstants.defaultMessages.globalNoMatch, runtime.project),
    };
  }

  if (!isPromptContentEmpty(globalNoMatchPrompt?.content)) {
    const output = globalNoMatchPrompt?.content;

    if (output) return { output };
  }

  return null;
};

export const NoMatchHandler = (utils: typeof utilsObj) => ({
  handle: async (_node: NoMatchNode, runtime: Runtime, variables: Store) => {
    const node = convertDeprecatedNoMatch(_node);
    const noMatchCounter = runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER) ?? 0;
    const output = await getOutput(node, runtime, noMatchCounter);

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
      output: output.output,
      variables: variables.getState(),
      ai: output.ai,
    });

    runtime.storage.set(StorageType.NO_MATCHES_COUNTER, noMatchCounter + 1);

    utils.addButtonsIfExists(node, runtime, variables);
    utils.addNoReplyTimeoutIfExists(node, runtime);
    return node.id;
  },
});

export default () => NoMatchHandler(utilsObj);
