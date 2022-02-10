import { BaseNode, BaseRequest } from '@voiceflow/base-types';

import { GeneralRuntime, isIntentRequest } from '@/lib/services/runtime/types';
import { Runtime, Store } from '@/runtime';

import { mapEntities } from '../../utils';

const entitiesToMappings = (entities: BaseRequest.Entity[]) => entities.map(({ name }) => ({ slot: name, variable: name }));

export interface Matcher<R = unknown, E = unknown> {
  match: (context: { runtime: GeneralRuntime; event: BaseNode.Utils.BaseEvent | null }) => boolean;
  sideEffect: (context: { runtime: Runtime<R>; event: E }) => (variables: Store) => void;
}

export const intentEventMatcher: Matcher<BaseRequest.IntentRequest, BaseNode.Utils.IntentEvent> = {
  match: (context): context is { runtime: Runtime<BaseRequest.IntentRequest>; event: BaseNode.Utils.IntentEvent } => {
    const request = context.runtime.getRequest();
    if (!isIntentRequest(request)) return false;
    if (context.event?.type !== BaseNode.Utils.EventType.INTENT) return false;
    if ((context.event as BaseNode.Utils.IntentEvent).intent !== request.payload.intent.name) return false;
    return true;
  },
  sideEffect: (context) => (variables) => {
    // use event slot mappings map request entities to variables
    const request = context.runtime.getRequest() as BaseRequest.IntentRequest;
    const entities = request.payload.entities || [];
    variables.merge(mapEntities(context.event.mappings || entitiesToMappings(entities), entities));
  },
};

export interface GeneralEvent extends BaseNode.Utils.BaseEvent {
  name: string;
}

export const generalEventMatcher: Matcher = {
  match: (context: {
    runtime: GeneralRuntime;
    event: BaseNode.Utils.BaseEvent | null;
  }): context is { runtime: Runtime<BaseRequest.BaseRequest>; event: GeneralEvent } => {
    const request = context.runtime.getRequest();
    if (!request || isIntentRequest(request)) return false;
    if (!context.event?.type) return false;
    if (context.event.type !== request.type) return false;

    return true;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sideEffect: () => () => {
    // to-do: trace event side effect management
  },
};

const EVENT_MATCHERS = [intentEventMatcher, generalEventMatcher];

export const findEventMatcher = (context: { event: BaseNode.Utils.BaseEvent | null; runtime: GeneralRuntime }) => {
  const matcher = EVENT_MATCHERS.find((m) => m.match(context));

  if (!matcher) return null;
  return { sideEffect: matcher.sideEffect(context as any) };
};
