import { formatIntentName } from '@voiceflow/common';
import { EventType, GeneralEvent, IntentEvent, IntentRequest } from '@voiceflow/general-types';
import { Runtime, Store } from '@voiceflow/runtime';

import { GeneralRuntime, isIntentRequest } from '@/lib/services/runtime/types';

import { mapEntities } from '../../utils';

export const intentEventMatcher = {
  match: (context: { runtime: GeneralRuntime; event: GeneralEvent | null }): context is { runtime: Runtime<IntentRequest>; event: IntentEvent } => {
    const request = context.runtime.getRequest();
    if (!isIntentRequest(request)) return false;
    if (context.event?.type !== EventType.INTENT) return false;
    if (formatIntentName(context.event.intent) !== formatIntentName(request.payload.intent.name)) return false;
    return true;
  },
  sideEffect: (context: { runtime: Runtime<IntentRequest>; event: IntentEvent; variables: Store }) => {
    // use event slot mappings map request entities to variables
    const request = context.runtime.getRequest() as IntentRequest;
    context.variables.merge(mapEntities(context.event.mappings || [], request.payload.entities || []));
  },
};

const EventMatchers = [intentEventMatcher];

export const findEventMatcher = (context: { event: GeneralEvent | null; runtime: GeneralRuntime; variables: Store }) => {
  const matcher = EventMatchers.find((m) => m.match(context));

  if (!matcher) return null;
  return { ...matcher, sideEffect: () => matcher.sideEffect(context as any) };
};

export const hasEventMatch = (event: GeneralEvent | null, runtime: GeneralRuntime) => !!EventMatchers.find((m) => m.match({ event, runtime }));
