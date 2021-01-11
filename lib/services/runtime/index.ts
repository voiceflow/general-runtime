import { GeneralTrace } from '@voiceflow/general-types';
import Client from '@voiceflow/runtime';

import { Config, Context, ContextHandler } from '@/types';

import { FullServiceMap } from '../index';
import { AbstractManager, injectServices } from '../utils';
import Handlers from './handlers';
import init from './init';
import { isRuntimeRequest, RuntimeRequest } from './types';

export const utils = {
  Client,
  Handlers,
};

@injectServices({ utils })
class RuntimeManager extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  private client: Client<RuntimeRequest>;

  private handlers: ReturnType<typeof Handlers>;

  constructor(services: FullServiceMap, config: Config) {
    super(services, config);

    this.handlers = this.services.utils.Handlers(config);

    this.client = new this.services.utils.Client({
      api: services.dataAPI,
      services,
      handlers: this.handlers,
    });

    init(this.client);
  }

  public async handle({ versionID, state, request, ...context }: Context) {
    if (!isRuntimeRequest(request)) throw new Error(`invalid runtime request type: ${JSON.stringify(request)}`);

    const runtime = this.client.createRuntime(versionID, state, request, { api: context.data.api });

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
