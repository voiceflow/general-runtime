import { BaseNode, BaseRequest, Nullable } from '@voiceflow/base-types';
import * as DTO from '@voiceflow/dtos';

import { GeneralRuntime } from '@/lib/services/runtime/types';
import { Runtime, Store } from '@/runtime';

import { mapEntities, mapVariables } from '../utils';

const entitiesToMappings = (entities: BaseRequest.Entity[]) =>
  entities.map(({ name }) => ({ slot: name, variable: name }));

export interface MatchContext {
  event: BaseNode.Utils.BaseEvent | null;
  runtime: GeneralRuntime;
  diagramID?: string | null;
}

export interface SideEffectContext<
  Request extends BaseRequest.BaseRequest = BaseRequest.BaseRequest,
  Event extends BaseNode.Utils.BaseEvent = BaseNode.Utils.BaseEvent
> {
  event: Event;
  runtime: Runtime<Request>;
}

export interface Matcher<
  Request extends BaseRequest.BaseRequest = BaseRequest.BaseRequest,
  Event extends BaseNode.Utils.BaseEvent = BaseNode.Utils.BaseEvent
> {
  match: (context: MatchContext) => context is SideEffectContext<Request, Event>;
  sideEffect: (context: SideEffectContext<Request, Event>) => (variables: Store) => void;
}

const isIntentEvent = (request: DTO.IntentRequest, context: any) => {
  if (!DTO.isLegacyIntentRequest(request)) return false;
  if (request.diagramID && context.diagramID && request.diagramID !== context.diagramID) return false;
  if (!context.event || !BaseNode.Utils.isIntentEvent(context.event)) return false;
  if (context.event.intent !== request.payload.intent.name) return false;
  return true;
};

/**
 * Intent request is being reused for both Alexa events and intent events. To distinguish them we check
 * if `request.payload.data` exists, if so this is an Alexa event
 */
const isAlexaEvent = (request: DTO.IntentRequest, context: any) => {
  if (!DTO.isAlexaIntentRequest(request)) return false;
  if (request.diagramID && context.diagramID && request.diagramID !== context.diagramID) return false;
  if (!context.event || context.event.type !== BaseNode.Utils.EventType.ALEXA) return false;
  if (context.event.intent !== request.payload.intent.name) return false;
  return true;
};

export const intentEventMatcher: Matcher<BaseRequest.IntentRequest, BaseNode.Utils.IntentEvent> = {
  match: (context): context is SideEffectContext<BaseRequest.IntentRequest, BaseNode.Utils.IntentEvent> => {
    const request = context.runtime.getRequest();

    if (!DTO.isLegacyIntentRequest(request)) return false;
    if (DTO.isAlexaIntentRequest(request)) return false;
    if (!isIntentEvent(request, context)) return false;
    if (isAlexaEvent(request, context)) return false;

    return true;
  },
  sideEffect: (context) => (variables) => {
    // use event slot mappings map request entities to variables
    const request = context.runtime.getRequest();
    const entities = request?.payload.entities || [];

    variables.merge(mapEntities(context.event.mappings || entitiesToMappings(entities), entities));
  },
};

export const alexaEventMatcher: Matcher<BaseRequest.IntentRequest, BaseNode.Utils.AlexaEvent> = {
  match: (context): context is SideEffectContext<BaseRequest.IntentRequest, BaseNode.Utils.AlexaEvent> => {
    const request = context.runtime.getRequest();

    if (DTO.isLegacyIntentRequest(request)) return false;
    if (!DTO.isAlexaIntentRequest(request)) return false;
    if (isIntentEvent(request, context)) return false;
    if (!isAlexaEvent(request, context)) return false;

    return true;
  },
  sideEffect: (context) => (variables) => {
    const request = context.runtime.getRequest() as BaseRequest.IntentRequest;

    const variableChanges = context.event.mappings?.reduce(
      (acc, mapping) => ({
        ...acc,
        ...(mapping.var && { [mapping.var]: mapVariables(mapping.path, request.payload.data!) }),
      }),
      {}
    );

    variables.merge(variableChanges);
  },
};

export interface GeneralEvent extends BaseNode.Utils.BaseEvent {
  name: string;
}

export const generalEventMatcher: Matcher<BaseRequest.BaseRequest, BaseNode.Utils.BaseEvent> = {
  match: (context): context is SideEffectContext<BaseRequest.BaseRequest, BaseNode.Utils.BaseEvent> => {
    const request = context.runtime.getRequest();

    if (!request || DTO.isLegacyIntentRequest(request) || DTO.isAlexaIntentRequest(request)) return false;
    if (!context.event?.type) return false;
    if (context.event.type !== request.type) return false;

    return true;
  },

  sideEffect: () => () => {
    // to-do: trace event side effect management
  },
};

const EVENT_MATCHERS: Matcher<any, any>[] = [intentEventMatcher, alexaEventMatcher, generalEventMatcher];

export interface EventMatcher {
  sideEffect: (variables: Store) => void;
}

export const findEventMatcher = (context: MatchContext): Nullable<EventMatcher> => {
  // eslint-disable-next-line no-restricted-syntax
  for (const matcher of EVENT_MATCHERS) {
    if (matcher.match(context)) return { sideEffect: matcher.sideEffect(context) };
  }

  return null;
};
