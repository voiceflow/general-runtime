import { BaseNode, BaseRequest, BaseText, BaseTrace, BaseVersion } from '@voiceflow/base-types';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import AI from '@/lib/clients/ai';
import {
  AiRequestActionType,
  isPrompt,
  NoMatchCounterStorage,
  Output,
  SegmentEventType,
  StorageType,
} from '@/lib/services/runtime/types';
import {
  addButtonsIfExists,
  addOutputTrace,
  getGlobalNoMatch,
  getOutputTrace,
  isPromptContentEmpty,
  isPromptContentInitialized,
  removeEmptyPrompts,
  slateToPlaintext,
} from '@/lib/services/runtime/utils';
import log from '@/logger';
import { Runtime, Store } from '@/runtime';

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

const sendSegmentEvent = async (
  runtime: Runtime,
  action_type: AiRequestActionType,
  startTime: any,
  result: { output?: Output; tokens: number; queryTokens: number; answerTokens: number } | null
): Promise<void | null> => {
  const responseTokens = result?.answerTokens ?? 0;
  const queryTokens = result?.queryTokens ?? 0;
  const currentDate = new Date().toISOString().slice(0, 10);

  const properties = {
    action_type,
    source: 'Runtime',
    response_tokens: responseTokens,
    response_content: slateToPlaintext(result?.output as BaseText.SlateTextValue),
    runtime: performance.now() - startTime,
    total_tokens: queryTokens + responseTokens,
    workspace_id: runtime?.project?.teamID,
    organiztion_id: runtime?.project?.teamID,
    project_id: runtime?.project?._id,
    project_platform: runtime?.project?.platform,
    project_type: runtime?.project?.type,
    model: runtime?.project?.knowledgeBase?.settings?.summarization.model,
    temperature: runtime?.project?.knowledgeBase?.settings?.summarization.temperature,
    max_tokens: runtime?.project?.knowledgeBase?.settings?.summarization.maxTokens,
    system_prompt: runtime?.project?.knowledgeBase?.settings?.summarization.prompt,
    prompt_tokens: queryTokens,
    success: !!result?.output,
    http_return_code: !result?.output ? 500 : 200,
  };

  const analyticsPlatformClient = await runtime.services.analyticsPlatform.getClient();

  if (analyticsPlatformClient) {
    analyticsPlatformClient.track({
      identity: { userID: Number(runtime?.project?.creatorID.toString()) },
      name: SegmentEventType.AI_REQUEST,
      properties: { ...properties, last_product_activity: currentDate },
    });
  }
};

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

    // use knowledge base if it exists
    let result: { output?: Output; tokens: number; queryTokens: number; answerTokens: number } | null = null;
    if (Object.values(runtime.project?.knowledgeBase?.documents || {}).length > 0) {
      const startTime = performance.now();
      result = await knowledgeBaseNoMatch(runtime);
      const action_type = AiRequestActionType.KB_FALLBACK;

      sendSegmentEvent(runtime, action_type, startTime, result).catch(() => null);

      const model = AI.get(runtime.project?.knowledgeBase?.settings?.summarization.model);
      await consumeResources('KB Fallback', runtime, model, result);
    }

    // hit global no match if KB wasn't successful
    if (!result?.output && globalNoMatch?.type === BaseVersion.GlobalNoMatchType.GENERATIVE) {
      const startTime = performance.now();
      result = await generateNoMatch(runtime, globalNoMatch.prompt);

      const action_type = AiRequestActionType.AI_GLOBAL_NO_MATCH;

      sendSegmentEvent(runtime, action_type, startTime, result).catch(() => null);

      const model = AI.get(globalNoMatch.prompt.model);
      await consumeResources('Generative No Match', runtime, model, result);
    }

    if (result?.output) return { output: result.output, ai: true, tokens: result.tokens };
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
