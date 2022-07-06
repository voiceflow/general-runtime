import { RuntimeLogs } from '@voiceflow/base-types';
import assert from 'assert/strict';

import { Context, ContextHandler } from '@/types';

import { isIntentRequest } from '../runtime/types';
import { AbstractManager, injectServices } from '../utils';
import { natoApcoConverter } from './natoApco';

export const utils = {};

@injectServices({ utils })
class SlotsService extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  handle = async (context: Context) => {
    if (!isIntentRequest(context.request)) {
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
      const runtime = this.services.runtime.getRuntimeForContext(context);
      runtime.debugLogging.recordGlobalLog(RuntimeLogs.Kinds.GlobalLogKind.NLU_INTENT_RESOLVED, {
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
