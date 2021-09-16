import { Node, Request } from '@voiceflow/base-types';

import { GeneralRuntime, isIntentRequest } from '@/lib/services/runtime/types';
import { Runtime, Store } from '@/runtime';

import { mapEntities } from '../../utils';

const entitiesToMappings = (entities: Request.Entity[]) => entities.map(({ name }) => ({ slot: name, variable: name }));

export const intentEventMatcher = {
  match: (context: {
    runtime: GeneralRuntime;
    event: Node.Utils.BaseEvent | null;
  }): context is { runtime: Runtime<Request.IntentRequest>; event: Node.Utils.IntentEvent } => {
    const request = context.runtime.getRequest();
    if (!isIntentRequest(request)) return false;
    if (context.event?.type !== Node.Utils.EventType.INTENT) return false;
    if ((context.event as Node.Utils.IntentEvent).intent !== request.payload.intent.name) return false;
    return true;
  },
  sideEffect: (context: { runtime: Runtime<Request.IntentRequest>; event: Node.Utils.IntentEvent; variables: Store }) => {
    // use event slot mappings map request entities to variables
    const request = context.runtime.getRequest() as Request.IntentRequest;
    const entities = request.payload.entities || [];
    context.variables.merge(mapEntities(context.event.mappings || entitiesToMappings(entities), entities));
  },
};

export interface GeneralEvent extends Node.Utils.BaseEvent {
  name: string;
}

export const generalEventMatcher = {
  match: (context: {
    runtime: GeneralRuntime;
    event: Node.Utils.BaseEvent | null;
  }): context is { runtime: Runtime<Request.BaseRequest>; event: GeneralEvent } => {
    const request = context.runtime.getRequest();
    if (!request || isIntentRequest(request)) return false;
    if (!context.event?.type) return false;
    if (context.event.type !== request.type) return false;

    return true;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sideEffect: (_context: { runtime: Runtime<Request.IntentRequest>; event: GeneralEvent; variables: Store }) => {
    // to-do: trace event side effect management
  },
};

const EVENT_MATCHERS = [intentEventMatcher, generalEventMatcher];

export const findEventMatcher = (context: { event: Node.Utils.BaseEvent | null; runtime: GeneralRuntime; variables: Store }) => {
  const matcher = EVENT_MATCHERS.find((m) => m.match(context));

  if (!matcher) return null;
  return { ...matcher, sideEffect: () => matcher.sideEffect(context as any) };
};

export const hasEventMatch = (event: Node.Utils.BaseEvent | null, runtime: GeneralRuntime) =>
  !!EVENT_MATCHERS.find((m) => m.match({ event, runtime }));
