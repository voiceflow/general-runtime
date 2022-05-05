import { AnyRecord } from '@voiceflow/base-types';

import { DataAPI } from '@/runtime/lib/DataAPI';
import { AbstractLifecycle } from '@/runtime/lib/Lifecycle';
import Runtime, { Options as RuntimeOptions, State as RuntimeState } from '@/runtime/lib/Runtime';

class Controller<R = any, D extends DataAPI = DataAPI, S extends AnyRecord = AnyRecord> extends AbstractLifecycle {
  private options: Pick<RuntimeOptions<D, S>, 'api' | 'handlers' | 'services'>;

  constructor({ api, handlers = [], services = {} as S }: RuntimeOptions<D, S>) {
    super();

    this.options = {
      api,
      handlers,
      services,
    };
  }

  public createRuntime(versionID: string, state: RuntimeState, request?: R, options?: RuntimeOptions<D, S>): Runtime<R, D, S> {
    return new Runtime<R, D, S>(versionID, state, request, { ...this.options, ...options }, this.events);
  }
}

export default Controller;
