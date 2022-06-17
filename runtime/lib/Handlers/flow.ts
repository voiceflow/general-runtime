import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';

import { S } from '@/runtime/lib/Constants';
import { HandlerFactory } from '@/runtime/lib/Handler';
import Frame from '@/runtime/lib/Runtime/Stack/Frame';

import DebugLogging from '../Runtime/DebugLogging';
import { mapStores } from '../Runtime/utils/variables';

const FlowHandler: HandlerFactory<BaseNode.Flow.Node> = () => ({
  canHandle: (node) => !!node.diagram_id,
  handle: (node, runtime, variables) => {
    if (!node.diagram_id) {
      // TODO: Check if this runs when you run a flow node where you haven't set the linked flow
      // Update the log type to support logging a "before: {current flow} after: null" or something
      // Maybe just log null entirely instead of a before after thingy
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

    runtime.trace.debug(`entering flow \`${newFrame.getName() || newFrame.getProgramID()}\``, BaseNode.NodeType.FLOW);
    runtime.debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.FLOW, node, {
      before: DebugLogging.createFlowReference(topFrame),
      after: DebugLogging.createFlowReference(newFrame),
    });

    return null;
  },
});

export default FlowHandler;
