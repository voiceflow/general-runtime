/**
 * [[include:runtime.md]]
 * @packageDocumentation
 */

import { GeneralTrace } from '@voiceflow/general-types';

import { Event } from '@/lib/clients/ingest-client';
import { Variables } from '@/lib/services/runtime/types';
import Client from '@/runtime';
import { Config, Context, ContextHandler } from '@/types';

import { FullServiceMap } from '../index';
import CacheDataAPI from '../state/cacheDataAPI';
import { AbstractManager, injectServices } from '../utils';
import Handlers from './handlers';
import init from './init';
import { isIntentRequest, isRuntimeRequest, TurnType } from './types';
import { getReadableConfidence } from './utils';

export const utils = {
  Client,
  Handlers,
};

@injectServices({ utils })
class RuntimeManager extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  private handlers: ReturnType<typeof Handlers>;

  constructor(services: FullServiceMap, config: Config) {
    super(services, config);
    this.handlers = this.services.utils.Handlers(config);
  }

  createClient(api: CacheDataAPI) {
    const client = new this.services.utils.Client({
      api,
      services: this.services,
      handlers: this.handlers,
    });

    init(client);

    return client;
  }

  public async handle({ versionID, state, request, ...context }: Context) {
    if (!isRuntimeRequest(request)) throw new Error(`invalid runtime request type: ${JSON.stringify(request)}`);

    const runtime = this.createClient(context.data.api).createRuntime(versionID, state, request);

    if (isIntentRequest(request)) {
      const confidence = getReadableConfidence(request.payload.confidence);

      runtime.trace.debug(`matched intent **${request.payload.intent.name}** - confidence interval _${confidence}%_`);

      runtime.variables.set('intent_confidence', Number(confidence));
    }

    if (context.data.config?.stopTypes) {
      runtime.turn.set(TurnType.STOP_TYPES, context.data.config.stopTypes);
    }
    if (context.data.config?.stopAll) {
      runtime.turn.set(TurnType.STOP_ALL, true);
    }

    runtime.variables.set(Variables.TIMESTAMP, Math.floor(Date.now() / 1000));
    await runtime.update();

    const result = {
      ...context,
      request,
      versionID,
      state: runtime.getFinalState(),
      trace: runtime.trace.get() as GeneralTrace[],
    };
    await this.services.analyticsClient!.track(versionID, Event.INTERACT, result);
    return result;
  }
}

export default RuntimeManager;
