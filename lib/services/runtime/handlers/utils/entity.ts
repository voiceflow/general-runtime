import { Node as BaseNode, Request, Trace } from '@voiceflow/base-types';

import { DMStore } from '@/lib/services/dialog';
import NoMatchHandler, { NoMatchNode } from '@/lib/services/runtime/handlers/noMatch';
import { Runtime, Store } from '@/runtime';

import { StorageType } from '../../types';

export const VF_ELICIT = 'ELICIT';

export const entityFillingRequest = (name: string): Request.IntentRequest => ({
  type: Request.RequestType.INTENT,
  payload: { intent: { name }, query: '', entities: [] },
});

/** @description when VF_ELICIT is true, it will skip the entity prompt during entity filling */
export const setElicit = (request: Request.IntentRequest, elicit: boolean): Request.IntentRequest & { [VF_ELICIT]: boolean } => ({
  ...request,
  [VF_ELICIT]: elicit,
});

export const hasElicit = (request: Request.IntentRequest & { [VF_ELICIT]?: boolean }): request is Request.IntentRequest & { [VF_ELICIT]: true } =>
  request[VF_ELICIT] === true;

const noMatchHandler = NoMatchHandler();

export const EntityFillingNoMatchHandler = () => ({
  handle: (node: NoMatchNode, runtime: Runtime, variables: Store) => (intents: string[] = [], defaultRequest?: Request.IntentRequest) => {
    // see if the prior entity filling intent is within context
    const priorIntent = runtime.storage.get<DMStore>(StorageType.DM)?.priorIntent;
    const priorIntentMatch = intents.includes(priorIntent?.payload.intent.name!) && priorIntent?.payload.entities.length;

    const nextRequest = (priorIntentMatch && setElicit(priorIntent!, false)) || defaultRequest;

    const noMatchPath = noMatchHandler.handle(node, runtime, variables);
    if (noMatchPath === node.id && nextRequest) {
      runtime.trace.addTrace<Trace.GoToTrace>({
        type: BaseNode.Utils.TraceType.GOTO,
        payload: { request: nextRequest },
      });
    }
    return noMatchPath;
  },
});
