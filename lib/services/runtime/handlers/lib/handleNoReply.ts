import { NodeType, WithCompiledNoReply } from '@voiceflow/dtos';
import { NoReplyNode } from '@voiceflow/voiceflow-types/build/cjs/node/utils';

import { Runtime, Store } from '@/runtime';
import { ErrorRaiser } from '@/utils/logError/logError';

import { getMessageText } from '../../utils/cms/message';
import { NoReplyHandler } from '../noReply';

type NoReplyReturn =
  | {
      shouldTransfer: false;
    }
  | {
      shouldTransfer: true;
      nextStepID: string | null;
    };

export async function handleNoReply(
  node: { id: string; type: NodeType; fallback: WithCompiledNoReply },
  runtime: Runtime,
  variables: Store,
  noReplyHandler: ReturnType<typeof NoReplyHandler>,
  errorRaiser: ErrorRaiser = Error
): Promise<NoReplyReturn> {
  if (!node.fallback.noReply || !node.fallback.noReply.responseID) {
    return {
      shouldTransfer: false,
    };
  }

  const prompts = getMessageText(runtime, node.fallback.noReply.responseID, errorRaiser);
  const adaptedNode: NoReplyNode = {
    id: 'dummy',
    type: node.type,
    noReply: {
      prompts,
    },
  };

  const nextStepID = noReplyHandler.handle(adaptedNode, runtime, variables);

  return {
    shouldTransfer: true,
    nextStepID,
  };
}
