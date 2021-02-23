/**
 * [[include:runtime.md]]
 * @packageDocumentation
 */

import { GeneralTrace } from '@voiceflow/general-types';
import Client from '@voiceflow/runtime';

import { Config, Context, ContextHandler } from '@/types';

import { FullServiceMap } from '../index';
import CacheDataAPI from '../state/cacheDataAPI';
import { AbstractManager, injectServices } from '../utils';
import Handlers from './handlers';
import init from './init';
import { isIntentRequest, isRuntimeRequest } from './types';
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
      runtime.trace.debug(
        `matched intent **${request.payload.intent.name}** - confidence interval _${getReadableConfidence(request.payload.confidence)}%_`
      );
    }

    await runtime.update();

    return {
      ...context,
      request,
      versionID,
      state: runtime.getFinalState(),
      trace: runtime.trace.get() as GeneralTrace[],
    };
  }
}

export default RuntimeManager;
