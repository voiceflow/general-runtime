import { BaseNode } from '@voiceflow/api-sdk';

import Program from '@/runtime/lib/Program';
import Runtime from '@/runtime/lib/Runtime';
import Store from '@/runtime/lib/Runtime/Store';

export default interface Handler<N extends BaseNode = BaseNode, R extends any = any> {
  canHandle: (node: N, runtime: Runtime<R>, variables: Store, program: Program) => boolean;
  handle: (node: N, runtime: Runtime<R>, variables: Store, program: Program) => null | string | Promise<string | null>;
}

export type HandlerFactory<N extends BaseNode, O = void> = (options: O) => Handler<N>;
