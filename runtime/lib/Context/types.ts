import { TraceFrame } from '@voiceflow/general-types';

import { State } from '@/runtime/lib/Runtime';

export type Context<R = Record<string, unknown>, T = TraceFrame, D = Record<string, unknown>> = {
  request: R;
  state: Omit<State, 'trace'>;
  versionID: string;
  trace?: T[];
  end?: boolean;
  data: D;
};

export type ContextHandle<C extends Context<any, any, any>> = (request: C) => C | Promise<C>;

export interface ContextHandler<C extends Context<any, any, any>> {
  handle: ContextHandle<C>;
}

// for request handlers that generate the runtime
export type PartialContext<C extends Context<any, any, any>> = Omit<Partial<C>, 'data'> & { data?: Partial<C['data']> };
export type InitContextHandle<C extends Context<any, any, any>> = (params: PartialContext<C>) => C | Promise<C>;

export interface InitContextHandler<C extends Context<any, any, any>> {
  handle: InitContextHandle<C>;
}
