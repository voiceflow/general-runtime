import { NodeType, TraceType } from '@voiceflow/general-types';
import { Node } from '@voiceflow/general-types/build/nodes/visual';
import { HandlerFactory } from '@voiceflow/runtime';

const VisualHandler: HandlerFactory<Node> = () => ({
  canHandle: (node) => node.type === NodeType.VISUAL && !!node.data,

  handle: (node, runtime) => {
    runtime.trace.debug('__visual__ - entered');

    runtime.trace.addTrace({
      type: TraceType.VISUAL,
      payload: node.data,
    });

    return node.nextId ?? null;
  },
});

export default VisualHandler;
