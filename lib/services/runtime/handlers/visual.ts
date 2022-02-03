import { BaseNode, BaseTrace } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime';

const VisualHandler: HandlerFactory<BaseNode.Visual.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.VISUAL && !!node.data,

  handle: (node, runtime) => {
    runtime.trace.debug('__visual__ - entered', BaseNode.NodeType.VISUAL);

    runtime.trace.addTrace<BaseTrace.VisualTrace>({
      type: BaseNode.Utils.TraceType.VISUAL,
      payload: node.data,
    });

    return node.nextId ?? null;
  },
});

export default VisualHandler;
