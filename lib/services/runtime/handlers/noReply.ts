import { Node as BaseNode, Text, Trace } from '@voiceflow/base-types';
import { Node as ChatNode } from '@voiceflow/chat-types';
import { Node as VoiceNode } from '@voiceflow/voice-types';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';

import { NoMatchCounterStorage, StorageType } from '../types';
import { addButtonsIfExists, outputTrace, removeEmptyPrompts } from '../utils';

type NoReplyNode = VoiceNode.Utils.NoReplyNode | ChatNode.Utils.NoReplyNode;

const utilsObj = {
  outputTrace,
  addButtonsIfExists,
};

const removeEmptyNoReplies = (node: NoReplyNode) => {
  const noReplies: Array<Text.SlateTextValue | string> = node.noReply?.prompts ?? (node.reprompt ? [node.reprompt] : null) ?? [];

  return removeEmptyPrompts(noReplies);
};

const getNoReplyID = (node: NoReplyNode) => node.noReply?.nodeID ?? null;

export const NoReplyHandler = (utils: typeof utilsObj) => ({
  handle: (node: NoReplyNode, runtime: Runtime, variables: Store) => {
    const nonEmptyNoReplies = removeEmptyNoReplies(node);

    const noReplyCounter = runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_REPLIES_COUNTER) ?? 0;

    if (noReplyCounter >= nonEmptyNoReplies.length) {
      // clean up no replies counter
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      runtime.trace.addTrace<Trace.PathTrace>({
        type: BaseNode.Utils.TraceType.PATH,
        payload: { path: 'choice:noReply' },
      });

      return getNoReplyID(node);
    }

    runtime.storage.set(StorageType.NO_REPLIES_COUNTER, noReplyCounter + 1);

    runtime.trace.addTrace<Trace.PathTrace>({
      type: BaseNode.Utils.TraceType.PATH,
      payload: { path: 'reprompt' },
    });

    const output = node.noReply?.randomize
      ? _.sample<string | Text.SlateTextValue>(nonEmptyNoReplies)
      : nonEmptyNoReplies?.[runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_REPLIES_COUNTER)! - 1];

    runtime.trace.addTrace(utils.outputTrace({ output, variables: variables.getState() }));

    return node.id;
  },
});

export default () => NoReplyHandler(utilsObj);
