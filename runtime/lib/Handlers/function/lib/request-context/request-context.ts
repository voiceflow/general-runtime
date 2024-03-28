import { isGeneralRequest } from '@voiceflow/base-types/build/cjs/request';
import { NotImplementedException } from '@voiceflow/exception';
import { isIntentRequest, isTextRequest } from '@voiceflow/utils-designer';

import Runtime from '@/runtime/lib/Runtime';

import { Event, EventType } from '../event/event.types';
import { fromFunctionGeneralButtonName } from '../execute-function/lib/adapt-trace';

export interface FunctionRequestContext {
  event?: Event;
}

export function createFunctionRequestContext(runtime: Runtime): FunctionRequestContext {
  const request = runtime.getRequest();

  if (isIntentRequest(request)) {
    const {
      intent: { name },
      confidence,
      entities = [],
      query,
    } = request.payload;

    return {
      event: {
        type: EventType.INTENT,
        name,
        confidence,
        entities: Object.fromEntries(entities.map((ent) => [ent.name, { name: ent.name, value: ent.value }])),
        utterance: query,
      },
    };
  }

  if (isGeneralRequest(request)) {
    return {
      event: {
        type: EventType.GENERAL,
        name: fromFunctionGeneralButtonName(request.type),
      },
    };
  }

  if (isTextRequest(request)) {
    return {
      event: {
        type: EventType.TEXT,
        value: request.payload,
      },
    };
  }

  throw new NotImplementedException('Function received an unexpected request type');
}
