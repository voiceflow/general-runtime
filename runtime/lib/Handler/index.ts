import { BaseModels } from '@voiceflow/base-types';

import Program from '@/runtime/lib/Program';
import Runtime from '@/runtime/lib/Runtime';
import Store from '@/runtime/lib/Runtime/Store';

import { HandleContextEventHandler } from '../Context/types';

export default interface Handler<N extends BaseModels.BaseNode = BaseModels.BaseNode, R extends Runtime = Runtime> {
  canHandle: (node: N, runtime: R, variables: Store, program: Program) => boolean;
  handle: (
    node: N,
    runtime: R,
    variables: Store,
    program: Program,
    eventHandler: HandleContextEventHandler
  ) => null | string | Promise<string | null>;
}

export type HandlerFactory<N extends BaseModels.BaseNode, O = void, R extends Runtime = Runtime> = (
  options: O
) => Handler<N, R>;
