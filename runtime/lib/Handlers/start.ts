import { Node } from '@voiceflow/general-types/build/nodes/start';

import { HandlerFactory } from '@/runtime/lib/Handler';

const StartHandler: HandlerFactory<Node> = () => ({
  canHandle: (node) => (Object.keys(node).length === 2 || node.type === 'start') && !!node.nextId,
  handle: (node, runtime) => {
    runtime.trace.debug('beginning flow');
    return node.nextId ?? null;
  },
});

export default StartHandler;
