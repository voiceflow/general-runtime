import { Node } from '@voiceflow/api-sdk';

import { HandlerFactory } from '@/runtime/lib/Handler';

export type NextNode = Node<'next', { nextId?: string }>;

const NextHandler: HandlerFactory<NextNode> = () => ({
  canHandle: (node) => !!node.nextId,
  handle: (node, runtime) => {
    runtime.trace.debug('could not handle step - redirecting to the next step');

    return node.nextId ?? null;
  },
});

export default NextHandler;
