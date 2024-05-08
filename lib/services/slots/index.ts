import { BaseRequest, RuntimeLogs } from '@voiceflow/base-types';
import assert from 'assert/strict';

import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';
import { natoApcoConverter } from './natoApco';

export const utils = {};

@injectServices({ utils })
class SlotsService extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  private isLUISIntentRequest(value: unknown): value is BaseRequest.IntentRequest {
    return (
      !!value &&
      typeof value === 'object' &&
      'type' in value &&
      typeof value.type === 'string' &&
      value.type === BaseRequest.RequestType.INTENT &&
      'payload' in value &&
      !!value.payload &&
      typeof value.payload === 'object' &&
      'intent' in value.payload &&
      typeof value.payload.intent === 'object' &&
      !!value.payload.intent &&
      'name' in value.payload.intent &&
      !!value.payload?.intent?.name &&
      'entities' in value.payload &&
      Array.isArray(value.payload.entities) &&
      !('data' in value.payload)
    );
  }

  handle = async (context: Context) => {
    if (!this.isLUISIntentRequest(context.request)) {
      return context;
    }

    const version = await context.data.api.getVersion(context.versionID);
    assert(version, new TypeError(`Version ${context.versionID} not found`));

    const slots = version.prototype?.model.slots;
    const { payload } = context.request;

    if (slots) {
      natoApcoConverter(payload.entities, slots, payload.query);
    }

    if (payload.confidence) {
      new DebugLogging(context).recordGlobalLog(RuntimeLogs.Kinds.GlobalLogKind.NLU_INTENT_RESOLVED, {
        confidence: payload.confidence,
        resolvedIntent: payload.intent.name,
        utterance: payload.query,
        entities: slots
          ? Object.fromEntries(payload.entities.map((entity) => [entity.name, { value: entity.value }]))
          : {},
      });
    }

    return context;
  };
}

export default SlotsService;
