import { BaseNode, BaseRequest, Nullable } from '@voiceflow/base-types';

import { GeneralRuntime, isIntentRequest } from '@/lib/services/runtime/types';
import { Runtime, Store } from '@/runtime';

import { mapEntities } from '../../utils';

const entitiesToMappings = (entities: BaseRequest.Entity[]) => entities.map(({ name }) => ({ slot: name, variable: name }));

export interface MatchContext {
  event: BaseNode.Utils.BaseEvent | null;
  runtime: GeneralRuntime;
  diagramID?: string | null;
}

export interface SideEffectContext<
  Request extends BaseRequest.BaseRequest<any> = BaseRequest.BaseRequest<any>,
  Event extends BaseNode.Utils.BaseEvent = BaseNode.Utils.BaseEvent
> {
  event: Event;
  runtime: Runtime<Request>;
}

export interface Matcher<
  Request extends BaseRequest.BaseRequest<any> = BaseRequest.BaseRequest<any>,
  Event extends BaseNode.Utils.BaseEvent = BaseNode.Utils.BaseEvent
> {
  match: (context: MatchContext) => context is SideEffectContext<Request, Event>;
  sideEffect: (context: SideEffectContext<Request, Event>) => (variables: Store) => void;
}

export const intentEventMatcher: Matcher<BaseRequest.IntentRequest, BaseNode.Utils.IntentEvent> = {
  match: (context): context is SideEffectContext<BaseRequest.IntentRequest, BaseNode.Utils.IntentEvent> => {
    const request = context.runtime.getRequest();

    if (!isIntentRequest(request)) return false;
    if (request.diagramID && context.diagramID && request.diagramID !== context.diagramID) return false;
    if (!context.event || !BaseNode.Utils.isIntentEvent(context.event)) return false;
    if (context.event.intent !== request.payload.intent.name) return false;

    return true;
  },
  sideEffect: (context) => (variables) => {
    // use event slot mappings map request entities to variables
    const request = context.runtime.getRequest();
    const entities = request?.payload.entities || [];

    variables.merge(mapEntities(context.event.mappings || entitiesToMappings(entities), entities));
  },
};

export interface GeneralEvent extends BaseNode.Utils.BaseEvent {
  name: string;
}

export const generalEventMatcher: Matcher<BaseRequest.BaseRequest, BaseNode.Utils.BaseEvent> = {
  match: (context): context is SideEffectContext<BaseRequest.BaseRequest, BaseNode.Utils.BaseEvent> => {
    const request = context.runtime.getRequest();

    if (!request || isIntentRequest(request)) return false;
    if (!context.event?.type) return false;
    if (context.event.type !== request.type) return false;

    return true;
  },

  sideEffect: () => () => {
    // to-do: trace event side effect management
  },
};

const EVENT_MATCHERS: Matcher<any, any>[] = [intentEventMatcher, generalEventMatcher];

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
