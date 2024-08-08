import { NodeType, WithCompiledNoMatch } from '@voiceflow/dtos';

import { Runtime, Store } from '@/runtime';
import { ErrorRaiser } from '@/utils/logError/logError';

import { NoMatchNode } from '../noMatch';
import { EntityFillingNoMatchHandler, entityFillingRequest } from '../utils/entity';
import { adaptNodeToV1 } from './adaptNode';
import { getEntityNamesOfIntent } from './getEntityNamesOfIntent';
import { resolveIntent } from './getSyntheticIntent';

type NoMatchReturn =
  | {
      shouldTransfer: false;
    }
  | {
      shouldTransfer: true;
      nextStepID: string | null;
    };

export async function handleNoMatchV2({
  intentName,
  node,
  runtime,
  variables,
  entityFillingNoMatchHandler,
  raiseError = Error,
}: {
  intentName: string;
  node: { id: string; type: NodeType; fallback: WithCompiledNoMatch; data: unknown };
  runtime: Runtime;
  variables: Store;
  entityFillingNoMatchHandler: ReturnType<typeof EntityFillingNoMatchHandler>;
  raiseError: ErrorRaiser;
}): Promise<NoMatchReturn> {
  if (!node.fallback.noMatch || !node.fallback.noMatch.responseID) {
    return {
      shouldTransfer: false,
    };
  }

  const adaptedNode: NoMatchNode = adaptNodeToV1(node, runtime, raiseError);

  const noMatchHandler = entityFillingNoMatchHandler.handle(adaptedNode, runtime, variables);

  const intent = resolveIntent(intentName, runtime, raiseError);
  const entityNames = getEntityNamesOfIntent(intent, runtime, raiseError);

  return {
    shouldTransfer: true,
    nextStepID: await noMatchHandler([intentName], entityFillingRequest(intentName, entityNames)),
  };
}
