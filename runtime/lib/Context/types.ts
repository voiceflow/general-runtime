import { BaseNode, BaseProject, BaseVersion, RuntimeLogs } from '@voiceflow/base-types';

import { State } from '@/runtime/lib/Runtime';

export interface Context<
  Request = Record<string, unknown>,
  Trace = BaseNode.Utils.BaseTraceFrame,
  Data = Record<string, unknown>,
  Version extends BaseVersion.Version = BaseVersion.Version,
  Project extends BaseProject.Project = BaseProject.Project
> {
  end?: boolean;
  data: Data;
  state: Omit<State, 'trace'>;
  trace?: Trace[];
  userID?: string;
  request: Request;
  version?: Version;
  project?: Project;
  versionID: string;
  projectID: string;
  plan?: string;
  /** The most verbose logs to receive in runtime logging. */
  maxLogLevel: RuntimeLogs.LogLevel;
}

export type ContextHandle<C extends Context<any, any, any, any, any>> = (
  request: C
) => C | Promise<C>;

export interface ContextHandler<C extends Context<any, any, any, any, any>> {
  handle: ContextHandle<C>;
}

type RequiredContextProperties = 'maxLogLevel';

// for request handlers that generate the runtime
export type PartialContext<C extends Context<any, any, any, any, any>> = Omit<
  Partial<C>,
  'data' | RequiredContextProperties
> &
  Pick<C, RequiredContextProperties> & {
    data?: Partial<C['data']>;
  };
export type InitContextHandle<C extends Context<any, any, any, any, any>> = (
  params: PartialContext<C>
) => C | Promise<C>;

export interface InitContextHandler<C extends Context<any, any, any, any, any>> {
  handle: InitContextHandle<C>;
}
