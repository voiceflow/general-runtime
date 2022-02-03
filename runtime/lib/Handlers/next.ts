import { BaseModels } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime/lib/Handler';

export interface NextNode extends BaseModels.BaseNode {
  nextId?: string;
}

const NextHandler: HandlerFactory<NextNode> = () => ({
  canHandle: (node) => !!node.nextId,
  handle: (node, runtime) => {
    runtime.trace.debug('could not handle step - redirecting to the next step');

    return node.nextId ?? null;
  },
});

export default NextHandler;
