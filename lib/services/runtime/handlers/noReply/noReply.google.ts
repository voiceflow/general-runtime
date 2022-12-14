import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';

import { StorageType } from '../../types';
import { isPromptContentEmpty, outputTrace } from '../../utils';
import { getGlobalNoReplyPrompt, processOutput, removeEmptyPrompts } from '../../utils.google';

const NO_INPUT_PREFIX = 'actions.intent.NO_INPUT';

export type NoReplyCounterStorage = number;

const getOutput = (
  node: VoiceflowNode.Utils.NoReplyNode,
  runtime: Runtime,
  variables: Store,
  noReplyCounter: number
) => {
  const nodeReprompt = node.reprompt ? [node.reprompt] : [];
  const noReplyPrompts = removeEmptyPrompts(node?.noReply?.prompts ?? nodeReprompt);

  if (noReplyCounter > noReplyPrompts.length) return null;

  if (noReplyCounter < noReplyPrompts.length) {
    const speak = node.noReply?.randomize ? _.sample(noReplyPrompts) : noReplyPrompts[noReplyCounter];
    return processOutput(speak, variables);
  }

  const globalNoReply = getGlobalNoReplyPrompt(runtime)?.content;

  if (!isPromptContentEmpty(globalNoReply)) return processOutput(globalNoReply, variables);

  return null;
};

export const NoReplyGoogleHandler = () => ({
  canHandle: (runtime: Runtime) => {
    const { payload } = runtime.getRequest() ?? {};
    return payload?.action?.startsWith(NO_INPUT_PREFIX) || payload?.intent?.name?.startsWith(NO_INPUT_PREFIX) || false;
  },

  handle: (node: VoiceflowNode.Utils.NoReplyNode, runtime: Runtime, variables: Store) => {
    const noReplyCounter = runtime.storage.get<NoReplyCounterStorage>(StorageType.NO_REPLIES_COUNTER) ?? 0;
    const output = getOutput(node, runtime, variables, noReplyCounter);

    if (!output) {
      // clean up no replies counter
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      runtime.trace.addTrace<BaseTrace.PathTrace>({
        type: BaseNode.Utils.TraceType.PATH,
        payload: { path: 'choice:noReply' },
      });

      return node.noReply?.nodeID ?? null;
    }

    runtime.trace.addTrace<BaseTrace.PathTrace>({
      type: BaseNode.Utils.TraceType.PATH,
      payload: { path: 'reprompt' },
    });

    runtime.storage.set(StorageType.NO_REPLIES_COUNTER, noReplyCounter + 1);

    outputTrace({
      addTrace: runtime.trace.addTrace.bind(runtime.trace),
      debugLogging: runtime.debugLogging,
      node,
      output,
      variables: variables.getState(),
    });

    return node.id;
  },
});

export default () => NoReplyGoogleHandler();
