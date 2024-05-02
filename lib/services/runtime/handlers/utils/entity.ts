import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import * as DTO from '@voiceflow/dtos';

import { DMStore } from '@/lib/services/dialog';
import NoMatchHandler, { NoMatchNode } from '@/lib/services/runtime/handlers/noMatch';
import { Runtime, Store } from '@/runtime';

import { StorageType, toBaseTypesIntent } from '../../types';

export const VF_ELICIT = 'ELICIT';

export const entityFillingRequest = (
  name: string,
  requiredEntities?: string[]
): DTO.IntentRequest & { requiredEntities?: string[] } => ({
  type: DTO.RequestType.INTENT,
  payload: { intent: { name }, query: '', entities: [] },
  requiredEntities,
});

/** @description when VF_ELICIT is true, it will skip the entity prompt during entity filling */
export const setElicit = (
  request: DTO.IntentRequest,
  elicit: boolean
): DTO.IntentRequest & { [VF_ELICIT]: boolean } => ({
  ...request,
  [VF_ELICIT]: elicit,
});

export const hasElicit = (
  request: DTO.IntentRequest & { [VF_ELICIT]?: boolean }
): request is DTO.IntentRequest & { [VF_ELICIT]: true } => request[VF_ELICIT] === true;

const noMatchHandler = NoMatchHandler();

export const EntityFillingNoMatchHandler = (elicitOverride?: boolean) => ({
  handle:
    (node: NoMatchNode, runtime: Runtime, variables: Store) =>
    async (intents?: string[], defaultRequest?: DTO.IntentRequest) => {
      // see if the prior entity filling intent is within context
      const priorIntent = runtime.storage.get<DMStore>(StorageType.DM)?.priorIntent;
      const priorIntentMatch =
        !!priorIntent &&
        (intents ?? []).includes(priorIntent.payload.intent.name) &&
        priorIntent?.payload.entities.length;

      const nextRequest = (priorIntentMatch && priorIntent) || defaultRequest;

      if (typeof runtime.storage.get(StorageType.NO_MATCHES_COUNTER) !== 'number' && nextRequest) {
        runtime.storage.set(StorageType.NO_MATCHES_COUNTER, 0);
        runtime.trace.addTrace<BaseTrace.GoToTrace>({
          type: BaseNode.Utils.TraceType.GOTO,
          payload: { request: toBaseTypesIntent(setElicit(nextRequest, elicitOverride ?? false)) },
        });
        return node.id;
      }

      const noMatchPath = await noMatchHandler.handle(node, runtime, variables);
      if (noMatchPath === node.id && nextRequest) {
        runtime.trace.addTrace<BaseTrace.GoToTrace>({
          type: BaseNode.Utils.TraceType.GOTO,
          payload: { request: toBaseTypesIntent(setElicit(nextRequest, elicitOverride ?? true)) },
        });
      }
      return noMatchPath;
    },
});

// for alexa the entity (re)prompts are never elicit, the prompt is always generated on the alexa side
export const EntityFillingNoMatchAlexaHandler = () => EntityFillingNoMatchHandler(false);
