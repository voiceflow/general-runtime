import * as BaseTypes from '@voiceflow/base-types';

import { DataAPI as AnyDataAPI } from '@/runtime/lib/DataAPI';
import { AbstractLifecycle } from '@/runtime/lib/Lifecycle';
import Runtime, { Options as RuntimeOptions, State as RuntimeState } from '@/runtime/lib/Runtime';

class Controller<
  Request = any,
  DataAPI extends AnyDataAPI = AnyDataAPI,
  Services extends BaseTypes.AnyRecord = BaseTypes.AnyRecord,
  Version extends BaseTypes.BaseVersion.Version = BaseTypes.BaseVersion.Version
> extends AbstractLifecycle {
  private options: Pick<RuntimeOptions<DataAPI, Services>, 'api' | 'handlers' | 'services'>;

  constructor({ api, handlers = [], services = {} as Services }: RuntimeOptions<DataAPI, Services>) {
    super();

    this.options = {
      api,
      handlers,
      services,
    };
  }

  public createRuntime(
    versionID: string,
    state: RuntimeState,
    request?: Request,
    options?: RuntimeOptions<DataAPI, Services>,
    version?: Version
  ): Runtime<Request, DataAPI, Services> {
    return new Runtime<Request, DataAPI, Services, Version>(
      versionID,
      state,
      request,
      { ...this.options, ...options },
      this.events,
      version
    );
  }
}

export default Controller;
