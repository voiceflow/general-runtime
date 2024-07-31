import { NodeType, WithCompiledNoMatch } from '@voiceflow/dtos';

import { Runtime, Store } from '@/runtime';
import { ErrorRaiser } from '@/utils/logError/logError';

import { getMessageText } from '../../utils/cms/message';
import { NoMatchNode } from '../noMatch';
import { EntityFillingNoMatchHandler, entityFillingRequest } from '../utils/entity';
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

export async function handleNoMatch({
  intentName,
  node,
  runtime,
  variables,
  entityFillingNoMatchHandler,
  raiseError = Error,
}: {
  intentName: string;
  node: { id: string; type: NodeType; fallback: WithCompiledNoMatch };
  runtime: Runtime;
  variables: Store;
  entityFillingNoMatchHandler: ReturnType<typeof EntityFillingNoMatchHandler>;
  raiseError: ErrorRaiser;
}): Promise<NoMatchReturn> {
  const { noMatch } = node.fallback;

  if (noMatch?.responseID) {
    const prompts = getMessageText(runtime, noMatch.responseID, raiseError);

    const adaptedNode: NoMatchNode = {
      id: 'dummy',
      type: node.type,
      noMatch: {
        prompts,
      },
    };

    const noMatchHandler = entityFillingNoMatchHandler.handle(adaptedNode, runtime, variables);

    const intent = resolveIntent(intentName, runtime, raiseError);
    const entityNames = getEntityNamesOfIntent(intent, runtime, raiseError);

    return {
      shouldTransfer: true,
      nextStepID: await noMatchHandler([intentName], entityFillingRequest(intentName, entityNames)),
    };
  }

  return {
    shouldTransfer: false,
  };
}
