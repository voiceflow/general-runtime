import { NodeType, WithCompiledNoReply } from '@voiceflow/dtos';

import { Runtime, Store } from '@/runtime';
import { ErrorRaiser } from '@/utils/logError/logError';

import { NoReplyHandler } from '../noReply';
import { adaptNodeToV1 } from './adaptNode';

type NoReplyReturn =
  | {
      shouldTransfer: false;
    }
  | {
      shouldTransfer: true;
      nextStepID: string | null;
    };

export async function handleNoReplyV2({
  node,
  runtime,
  variables,
  noReplyHandler,
  raiseError = Error,
}: {
  node: { id: string; type: NodeType; fallback: WithCompiledNoReply; data: unknown };
  runtime: Runtime;
  variables: Store;
  noReplyHandler: ReturnType<typeof NoReplyHandler>;
  raiseError: ErrorRaiser;
}): Promise<NoReplyReturn> {
  if (!node.fallback.noReply || !node.fallback.noReply.responseID) {
    return {
      shouldTransfer: false,
    };
  }

  const adaptedNode = adaptNodeToV1(node, runtime, raiseError);

  const nextStepID = noReplyHandler.handle(adaptedNode, runtime, variables);

  return {
    shouldTransfer: true,
    nextStepID,
  };
}
