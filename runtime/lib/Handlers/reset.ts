import { Node } from '@voiceflow/api-sdk';

import { HandlerFactory } from '@/runtime/lib/Handler';

export type ResetNode = Node<any, { reset?: boolean }>;

/**
 * reset the entire stack to the first flow and it's first node
 */
const ResetHandler: HandlerFactory<ResetNode> = () => ({
  canHandle: (node) => !!node.reset,
  handle: (_, runtime) => {
    runtime.stack.popTo(1);
    runtime.stack.top().setNodeID(undefined);

    return null;
  },
});

export default ResetHandler;
