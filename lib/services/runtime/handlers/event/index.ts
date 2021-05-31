import { Event, EventType, IntentEvent, IntentRequest, Request } from '@voiceflow/general-types';

import { GeneralRuntime, isIntentRequest } from '@/lib/services/runtime/types';
import { Runtime, Store } from '@/runtime';

import { mapEntities } from '../../utils';

export const intentEventMatcher = {
  match: (context: { runtime: GeneralRuntime; event: Event | null }): context is { runtime: Runtime<IntentRequest>; event: IntentEvent } => {
    const request = context.runtime.getRequest();
    if (!isIntentRequest(request)) return false;
    if (context.event?.type !== EventType.INTENT) return false;
    if ((context.event as IntentEvent).intent !== request.payload.intent.name) return false;
    return true;
  },
  sideEffect: (context: { runtime: Runtime<IntentRequest>; event: IntentEvent; variables: Store }) => {
    // use event slot mappings map request entities to variables
    const request = context.runtime.getRequest() as IntentRequest;
    context.variables.merge(mapEntities(context.event.mappings || [], request.payload.entities || []));
  },
};

type GeneralEvent = Event<string, { name: string }>;
export const generalEventMatcher = {
  match: (context: {
    runtime: GeneralRuntime;
    event: Event | null;
  }): context is { runtime: Runtime<Request>; event: Event<string, GeneralEvent> } => {
    const request = context.runtime.getRequest();
    if (!request || isIntentRequest(request)) return false;
    if (!context.event?.type) return false;
    if ((context.event as GeneralEvent).type !== request.type) return false;

    return true;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sideEffect: (_context: { runtime: Runtime<IntentRequest>; event: GeneralEvent; variables: Store }) => {
    // to-do: trace event side effect management
  },
};

const EventMatchers = [intentEventMatcher, generalEventMatcher];

export const findEventMatcher = (context: { event: Event | null; runtime: GeneralRuntime; variables: Store }) => {
  const matcher = EventMatchers.find((m) => m.match(context));

  if (!matcher) return null;
  return { ...matcher, sideEffect: () => matcher.sideEffect(context as any) };
};

export const hasEventMatch = (event: Event | null, runtime: GeneralRuntime) => !!EventMatchers.find((m) => m.match({ event, runtime }));
