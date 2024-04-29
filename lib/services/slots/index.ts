import { BaseRequest, RuntimeLogs } from '@voiceflow/base-types';
import assert from 'assert/strict';

import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';
import { natoApcoConverter } from './natoApco';

export const utils = {};

@injectServices({ utils })
class SlotsService extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  private isLUISIntentRequest(value: BaseRequest.BaseRequest | null): value is BaseRequest.IntentRequest {
    return (
      !!value &&
      BaseRequest.isIntentRequest(value) &&
      !!value.payload?.intent?.name &&
      Array.isArray(value.payload.entities) &&
      !value.payload?.data
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
