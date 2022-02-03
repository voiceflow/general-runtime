import { BaseNode } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime/lib/Handler';

const StartHandler: HandlerFactory<BaseNode.Start.Node> = () => ({
  canHandle: (node) => (Object.keys(node).length === 2 || node.type === 'start') && !!node.nextId,
  handle: (node, runtime) => {
    runtime.trace.debug('beginning flow', BaseNode.NodeType.START);
    return node.nextId ?? null;
  },
});

export default StartHandler;
