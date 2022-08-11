import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';

import { StorageType } from '../../types';
import { outputTrace } from '../../utils';
import { processOutput, removeEmptyPrompts } from '../../utils.google';

const NO_INPUT_PREFIX = 'actions.intent.NO_INPUT';

export type NoReplyCounterStorage = number;

export const NoReplyGoogleHandler = () => ({
  canHandle: (runtime: Runtime) => {
    const { payload } = runtime.getRequest() ?? {};
    return payload?.action?.startsWith(NO_INPUT_PREFIX) || payload?.intent?.name?.startsWith(NO_INPUT_PREFIX) || false;
  },

  handle: (node: VoiceflowNode.Utils.NoReplyNode, runtime: Runtime, variables: Store) => {
    const noReplyPrompts = removeEmptyPrompts(node?.noReply?.prompts ?? (node.reprompt ? [node.reprompt] : null));

    const noReplyCounter = runtime.storage.get<NoReplyCounterStorage>(StorageType.NO_REPLIES_COUNTER) ?? 0;

    if (noReplyCounter >= noReplyPrompts.length) {
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

    const speak = node.noReply?.randomize ? _.sample<string>(noReplyPrompts) : noReplyPrompts?.[noReplyCounter];
    const output = processOutput(speak, variables);

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
