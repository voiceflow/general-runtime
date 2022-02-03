import { BaseNode, BaseRequest, BaseText, BaseTrace } from '@voiceflow/base-types';
import { ChatNode } from '@voiceflow/chat-types';
import { VoiceNode } from '@voiceflow/voice-types';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';

import { NoReplyCounterStorage, StorageType } from '../types';
import { addButtonsIfExists, outputTrace, removeEmptyPrompts } from '../utils';

type NoReplyNode = BaseRequest.NodeButton & (VoiceNode.Utils.NoReplyNode | ChatNode.Utils.NoReplyNode);

const removeEmptyNoReplies = (node: NoReplyNode) => {
  const noReplies: Array<BaseText.SlateTextValue | string> = node.noReply?.prompts ?? (node.reprompt ? [node.reprompt] : null) ?? [];

  return removeEmptyPrompts(noReplies);
};

export const addNoReplyTimeoutIfExists = (node: NoReplyNode, runtime: Runtime): void => {
  if (!node.noReply?.timeout) return;

  runtime.trace.addTrace<BaseTrace.NoReplyTrace>({
    type: BaseNode.Utils.TraceType.NO_REPLY,
    payload: { timeout: node.noReply.timeout },
  });
};

const utilsObj = {
  outputTrace,
  addButtonsIfExists,
  addNoReplyTimeoutIfExists,
};

export const NoReplyHandler = (utils: typeof utilsObj) => ({
  canHandle: (runtime: Runtime) => runtime.getRequest() === null || BaseRequest.isNoReplyRequest(runtime.getRequest()),
  handle: (node: NoReplyNode, runtime: Runtime, variables: Store) => {
    const nonEmptyNoReplies = removeEmptyNoReplies(node);

    const noReplyCounter = runtime.storage.get<NoReplyCounterStorage>(StorageType.NO_REPLIES_COUNTER) ?? 0;

    if (noReplyCounter >= nonEmptyNoReplies.length) {
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

    const output = node.noReply?.randomize ? _.sample<string | BaseText.SlateTextValue>(nonEmptyNoReplies) : nonEmptyNoReplies?.[noReplyCounter];

    runtime.storage.set(StorageType.NO_REPLIES_COUNTER, noReplyCounter + 1);

    runtime.trace.addTrace(utils.outputTrace({ output, variables: variables.getState() }));

    utils.addButtonsIfExists(node, runtime, variables);
    utils.addNoReplyTimeoutIfExists(node, runtime);

    return node.id;
  },
});

export default () => NoReplyHandler(utilsObj);
