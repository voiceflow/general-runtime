import { BaseNode, BaseRequest, BaseText, BaseTrace, BaseVersion } from '@voiceflow/base-types';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { ContentModerationError } from '@/lib/clients/ai/contentModeration/utils';
import { FeatureFlag } from '@/lib/feature-flags';
import { Runtime, Store } from '@/runtime';

import { isPrompt, NoMatchCounterStorage, Output, StorageType } from '../types';
import {
  addButtonsIfExists,
  addOutputTrace,
  getGlobalNoMatch,
  getOutputTrace,
  isPromptContentEmpty,
  isPromptContentInitialized,
  removeEmptyPrompts,
} from '../utils';
import { addNoReplyTimeoutIfExists } from './noReply';
import { checkTokens, consumeResources } from './utils/ai';
import { generateNoMatch } from './utils/generativeNoMatch';
import { knowledgeBaseNoMatch } from './utils/knowledgeBase';
import { generateOutput } from './utils/output';

export type NoMatchNode = BaseRequest.NodeButton & VoiceflowNode.Utils.NoMatchNode & { type: BaseNode.NodeType };

export const utilsObj = {
  getOutputTrace,
  addOutputTrace,
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

const removeEmptyNoMatches = (node: NoMatchNode) => {
  const prompts: Array<BaseText.SlateTextValue | string> = node.noMatch?.prompts ?? [];

  return removeEmptyPrompts(prompts);
};

const getOutput = async (
  node: NoMatchNode,
  runtime: Runtime,
  noMatchCounter: number
  // eslint-disable-next-line sonarjs/cognitive-complexity
): Promise<{ output: Output; ai?: boolean; tokens?: number } | void | null> => {
  const nonEmptyNoMatches = removeEmptyNoMatches(node);
  const globalNoMatch = getGlobalNoMatch(runtime);
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

  if (runtime.project?.aiAssistSettings?.aiPlayground) {
    if (!(await checkTokens(runtime, node.type))) {
      return { output: generateOutput('global no match [token quota exceeded]', runtime.project), ai: true };
    }

    let result: { output?: Output; tokens: number; queryTokens: number; answerTokens: number } | null = null;
    try {
      // use knowledge base if it exists OR if the user has FAQs
      if (
        Object.values(runtime.project?.knowledgeBase?.documents || {}).length > 0 ||
        runtime.services.unleash.client.isEnabled(FeatureFlag.FAQ_FF, { workspaceID: Number(runtime.project?.teamID) })
      ) {
        result = await knowledgeBaseNoMatch(runtime);
        const kbSettings = runtime.version?.knowledgeBase?.settings || runtime.project?.knowledgeBase?.settings;
        const model = runtime.services.ai.get(kbSettings?.summarization.model, {
          projectID: runtime.project?._id,
          workspaceID: runtime.project?.teamID,
        });
        await consumeResources('KB Fallback', runtime, model, result);
      }

      // hit global no match if KB wasn't successful
      if (!result?.output && globalNoMatch?.type === BaseVersion.GlobalNoMatchType.GENERATIVE) {
        result = await generateNoMatch(runtime, globalNoMatch.prompt);
        const model = runtime.services.ai.get(globalNoMatch.prompt.model, {
          projectID: runtime.project?._id,
          workspaceID: runtime.project?.teamID,
        });
        await consumeResources('Generative No Match', runtime, model, result);
      }

      if (result?.output) return { output: result.output, ai: true, tokens: result.tokens };
    } catch (err) {
      if (err instanceof ContentModerationError) {
        return { output: generateOutput(`global no match ${err.message}`, runtime.project), ai: true };
      }
      throw err;
    }
  }

  const prompt = globalNoMatch && isPrompt(globalNoMatch?.prompt) ? globalNoMatch.prompt : null;

  // if user never set global no-match prompt, we should use default
  if (!isPromptContentInitialized(prompt?.content)) {
    return {
      output: generateOutput(VoiceflowConstants.defaultMessages.globalNoMatch, runtime.project),
    };
  }

  if (!isPromptContentEmpty(prompt?.content)) {
    const output = prompt?.content;
    if (output) return { output };
  }

  return null;
};

export const NoMatchHandler = (utils: typeof utilsObj) => ({
  handle: async (_node: NoMatchNode, runtime: Runtime, variables: Store) => {
    const node = convertDeprecatedNoMatch(_node);
    const noMatchCounter = runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER) ?? 0;

    const result = await getOutput(node, runtime, noMatchCounter);

    if (!result) {
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

    utils.addOutputTrace(
      runtime,
      utils.getOutputTrace({
        output: result.output,
        version: runtime.version,
        variables,
        ai: result.ai,
      }),
      { node, variables }
    );

    runtime.storage.set(StorageType.NO_MATCHES_COUNTER, noMatchCounter + 1);

    utils.addButtonsIfExists(node, runtime, variables);
    utils.addNoReplyTimeoutIfExists(node, runtime);
    return node.id;
  },
});

export default () => NoMatchHandler(utilsObj);
