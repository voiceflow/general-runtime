import { BaseNode, BaseRequest, BaseText, BaseTrace, BaseUtils, BaseVersion } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { GPT4_ABLE_PLAN } from '@/lib/clients/ai/types';
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
import { generateNoMatch } from './utils/generativeNoMatch';
import { knowledgeBaseNoMatch } from './utils/knowledgeBase';
import { generateOutput } from './utils/output';

export type NoMatchNode = BaseRequest.NodeButton & VoiceflowNode.Utils.NoMatchNode;

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
    // use knowledge base if it exists
    if (Object.values(runtime.project?.knowledgeBase?.documents || {}).length > 0) {
      const result = await knowledgeBaseNoMatch(runtime);
      if (result?.output) return { output: result.output, ai: true, tokens: result.tokens };
    }

    if (globalNoMatch?.type === BaseVersion.GlobalNoMatchType.GENERATIVE) {
      if (
        globalNoMatch.prompt.model === BaseUtils.ai.GPT_MODEL.GPT_4 &&
        runtime.plan &&
        !GPT4_ABLE_PLAN.has(runtime.plan)
      ) {
        return {
          output: 'GPT-4 is only available on the Pro plan. Please upgrade to use this feature.',
          ai: true,
          tokens: 0,
        };
      }

      const result = await generateNoMatch(runtime, globalNoMatch.prompt);
      if (result?.output) return { output: result.output, ai: true, tokens: result.tokens };
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
    const workspaceID = runtime.project?.teamID;
    const node = convertDeprecatedNoMatch(_node);
    const noMatchCounter = runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER) ?? 0;

    if (!(await runtime.services.billing.checkQuota(workspaceID, 'OpenAI Tokens'))) {
      throw new VError('Quota exceeded', VError.HTTP_STATUS.PAYMENT_REQUIRED);
    }

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

    if (typeof result.tokens === 'number' && result.tokens > 0) {
      await runtime.services.billing.consumeQuota(workspaceID, 'OpenAI Tokens', result.tokens);
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
