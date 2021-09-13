import { Node, Trace } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime';

const VisualHandler: HandlerFactory<Node.Visual.Node> = () => ({
  canHandle: (node) => node.type === Node.NodeType.VISUAL && !!node.data,

  handle: (node, runtime) => {
    runtime.trace.debug('__visual__ - entered', Node.NodeType.VISUAL);

    runtime.trace.addTrace<Trace.VisualTrace>({
      type: Node.Utils.TraceType.VISUAL,
      payload: node.data,
    });

    return node.nextId ?? null;
  },
});

export default VisualHandler;
