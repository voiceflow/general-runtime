import Client from '@voiceflow/runtime';

import { Context, ContextHandler } from '@/types';

import { FullServiceMap } from '../index';
import { AbstractManager, Config, injectServices } from '../utils';
import Handlers from './handlers';
import init from './init';

export const utils = {
  Client,
  Handlers,
};

@injectServices({ utils })
class RuntimeManager extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  private client: Client;

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

  public async handle({ versionID, state, request }: Context) {
    const runtime = this.client.createRuntime(versionID, state, request);

    await runtime.update();

    return {
      request,
      versionID,
      state: runtime.getFinalState(),
      trace: runtime.trace.get(),
    };
  }
}

export default RuntimeManager;
