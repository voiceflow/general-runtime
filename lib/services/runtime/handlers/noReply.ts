import { BaseNode, BaseRequest, BaseText, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';

import { NoReplyCounterStorage, StorageType } from '../types';
import {
  addButtonsIfExists,
  addOutputTrace,
  getDefaultNoReplyTimeoutSeconds,
  getDefaultVoiceSetting,
  getGlobalNoReplyPrompt,
  getOutputTrace,
  isPromptContentEmpty,
  removeEmptyPrompts,
} from '../utils';
import { generateOutput } from './utils/output';

type NoReplyNode = BaseRequest.NodeButton & VoiceflowNode.Utils.NoReplyNode;

const removeEmptyNoReplies = (node: NoReplyNode) => {
  const noReplies: Array<BaseText.SlateTextValue | string> =
    node.noReply?.prompts ?? (node.reprompt ? [node.reprompt] : null) ?? [];

  return removeEmptyPrompts(noReplies);
};

const getDelay = (node: NoReplyNode, runtime: Runtime) => {
  if (node.noReply?.timeout) return node.noReply?.timeout;

  /** if there's no no-reply configured to the step,
   * but we have a global no-reply, we should use global no-reply delay
   * */
  const globalNoReplyPrompt = getGlobalNoReplyPrompt(runtime);
  if (!isPromptContentEmpty(globalNoReplyPrompt?.content)) {
    return (
      runtime?.version?.platformData.settings.globalNoReply?.delay ??
      getDefaultNoReplyTimeoutSeconds(runtime.version?.prototype?.platform)
    );
  }

  return 0;
};

export const addNoReplyTimeoutIfExists = (node: NoReplyNode, runtime: Runtime, forceDelay?: number): void => {
  const delay = forceDelay ?? getDelay(node, runtime);

  if (!delay) return;

  runtime.trace.addTrace<BaseTrace.NoReplyTrace>({
    type: BaseNode.Utils.TraceType.NO_REPLY,
    payload: { timeout: delay },
  });
};

const getOutput = (runtime: Runtime, node: NoReplyNode, noReplyCounter: number) => {
  const nonEmptyNoReplies = removeEmptyNoReplies(node);
  const globalNoReplyPrompt = getGlobalNoReplyPrompt(runtime);
  const defaultVoice = getDefaultVoiceSetting(runtime);

  // use global no reply delay if next no-reply is expected to be the global one
  const useGlobalNoReplyDelay = noReplyCounter === nonEmptyNoReplies.length - 1;

  const globalNoReplyDelay =
    runtime?.version?.platformData.settings.globalNoReply?.delay ??
    getDefaultNoReplyTimeoutSeconds(runtime.version?.prototype?.platform);

  const delay = useGlobalNoReplyDelay ? globalNoReplyDelay : node.noReply?.timeout;

  if (noReplyCounter > nonEmptyNoReplies.length) return { delay, output: null };

  if (noReplyCounter < nonEmptyNoReplies.length) {
    const output = node.noReply?.randomize
      ? _.sample<string | BaseText.SlateTextValue>(nonEmptyNoReplies)
      : nonEmptyNoReplies?.[noReplyCounter];

    return {
      delay,
      output,
    };
  }

  if (!isPromptContentEmpty(globalNoReplyPrompt?.content)) {
    const output =
      typeof globalNoReplyPrompt?.content === 'string'
        ? generateOutput(globalNoReplyPrompt.content, runtime.project, globalNoReplyPrompt?.voice ?? defaultVoice)
        : globalNoReplyPrompt?.content;

    return { delay, output };
  }

  return { delay, output: null };
};

const utilsObj = {
  addOutputTrace,
  getOutputTrace,
  addButtonsIfExists,
  addNoReplyTimeoutIfExists,
};

export const NoReplyHandler = (utils: typeof utilsObj) => ({
  canHandle: (runtime: Runtime) => runtime.getRequest() === null || BaseRequest.isNoReplyRequest(runtime.getRequest()),
  handle: (node: NoReplyNode, runtime: Runtime, variables: Store) => {
    const noReplyCounter = runtime.storage.get<NoReplyCounterStorage>(StorageType.NO_REPLIES_COUNTER) ?? 0;

    const { output, delay } = getOutput(runtime, node, noReplyCounter);

    if (!output) {
      // clean up no replies counter
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      runtime.trace.addTrace<BaseTrace.PathTrace>({
        type: BaseNode.Utils.TraceType.PATH,
        payload: { path: 'choice:noReply' },
      });

      return node.noReply?.nodeID ?? null;
    }

    runtime.storage.set(StorageType.NO_REPLIES_COUNTER, noReplyCounter + 1);

    runtime.trace.addTrace<BaseTrace.PathTrace>({
      type: BaseNode.Utils.TraceType.PATH,
      payload: { path: 'reprompt' },
    });

    utils.addOutputTrace(
      runtime,
      utils.getOutputTrace({
        output,
        version: runtime.version,
        variables,
      }),
      { node, variables }
    );

    utils.addButtonsIfExists(node, runtime, variables);
    utils.addNoReplyTimeoutIfExists(node, runtime, delay);

    return node.id;
  },
});

export default () => NoReplyHandler(utilsObj);
