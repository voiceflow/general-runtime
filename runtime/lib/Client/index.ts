import * as BaseTypes from '@voiceflow/base-types';

import { DataAPI as AnyDataAPI } from '@/runtime/lib/DataAPI';
import { AbstractLifecycle } from '@/runtime/lib/Lifecycle';
import Runtime, { Options as RuntimeOptions, State as RuntimeState } from '@/runtime/lib/Runtime';

export interface CreateRuntimeOptions<
  Request,
  DataAPI extends AnyDataAPI,
  Services extends BaseTypes.AnyRecord,
  Version extends BaseTypes.BaseVersion.Version,
  Project extends BaseTypes.BaseProject.Project
> {
  versionID: string;
  state: RuntimeState;
  request?: Request;
  options?: RuntimeOptions<DataAPI, Services>;
  version?: Version;
  project?: Project;
  plan?: string;
  timeout: number;
}

class Controller<
  Request = any,
  DataAPI extends AnyDataAPI = AnyDataAPI,
  Services extends BaseTypes.AnyRecord = BaseTypes.AnyRecord,
  Version extends BaseTypes.BaseVersion.Version = BaseTypes.BaseVersion.Version,
  Project extends BaseTypes.BaseProject.Project = BaseTypes.BaseProject.Project
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

  public createRuntime({
    versionID,
    state,
    request,
    options,
    version,
    project,
    plan,
    timeout,
  }: CreateRuntimeOptions<Request, DataAPI, Services, Version, Project>): Runtime<Request, DataAPI, Services> {
    return new Runtime<Request, DataAPI, Services, Version, Project>({
      request,
      versionID,
      state,
      options: { ...this.options, ...options },
      events: this.events,
      version,
      project,
      plan,
      timeout,
    });
  }
}

export default Controller;
