import { DataAPI } from '@/runtime/lib/DataAPI';
import { AbstractLifecycle } from '@/runtime/lib/Lifecycle';
import Runtime, { Options as RuntimeOptions, State as RuntimeState } from '@/runtime/lib/Runtime';

class Controller<R extends any = any, D extends DataAPI = DataAPI> extends AbstractLifecycle {
  private options: Pick<RuntimeOptions<D>, 'api' | 'handlers' | 'services'>;

  constructor({ api, handlers = [], services = {} }: RuntimeOptions<D>) {
    super();

    this.options = {
      api,
      handlers,
      services,
    };
  }

  public createRuntime(versionID: string, state: RuntimeState, request?: R, options?: RuntimeOptions<D>, authorization?: string): Runtime<R, D> {
    return new Runtime<R, D>(versionID, state, request, { ...this.options, ...options, authorization }, this.events);
  }
}

export default Controller;
