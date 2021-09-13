import { Node } from '@voiceflow/base-types';

import { S } from '@/runtime/lib/Constants';
import { HandlerFactory } from '@/runtime/lib/Handler';
import Frame from '@/runtime/lib/Runtime/Stack/Frame';

import { mapStores } from '../Runtime/utils/variables';

const FlowHandler: HandlerFactory<Node.Flow.Node> = () => ({
  canHandle: (node) => !!node.diagram_id,
  handle: (node, runtime, variables) => {
    if (!node.diagram_id) {
      return node.nextId || null;
    }

    const newFrame = new Frame({ programID: node.diagram_id });

    // map node variable map input to frame
    mapStores(node.variable_map?.inputs || [], variables, newFrame.variables);

    // TODO: remove storage
    // attach node variable map outputs to frame
    newFrame.storage.set(
      S.OUTPUT_MAP,
      // adapt outputs format to [[currentVal, newVal]] - like inputs
      node.variable_map?.outputs?.map((val) => [val[1], val[0]])
    );

    const topFrame = runtime.stack.top();
    topFrame.setNodeID(node.nextId ?? null);

    runtime.stack.push(newFrame);

    runtime.trace.debug(`entering flow \`${newFrame.getName() || newFrame.getProgramID()}\``, Node.NodeType.FLOW);

    return null;
  },
});

export default FlowHandler;
