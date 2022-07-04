import { BaseNode, BaseTrace } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime/lib/Handler';
import { Frame } from '@/runtime/lib/Runtime/Stack';

const utilsObj = {
  Frame,
};

export const GoToNodeHandler: HandlerFactory<BaseNode.GoToNode.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.GOTO_NODE,

  handle: (node, runtime): string | null => {
    if (!node.diagramID || node.diagramID === runtime.stack.top().getProgramID()) return node.nextId ?? null;

    runtime.trace.addTrace<BaseTrace.PathTrace>({
      type: BaseNode.Utils.TraceType.PATH,
      payload: { path: 'jump' },
    });

    const frameIndex = runtime.stack.getFrames().findIndex((frame) => frame.getProgramID() === node.diagramID);

    // always keep base frame in the stack
    runtime.stack.popTo(Math.max(frameIndex + 1, 1));

    const newFrame = new utils.Frame({ programID: node.diagramID });

    runtime.stack.push(newFrame);
    runtime.stack.top().setNodeID(node.nextId || null);

    runtime.trace.debug(
      `entering flow \`${newFrame.getName() || newFrame.getProgramID()}\``,
      BaseNode.NodeType.GOTO_NODE
    );

    return null;
  },
});

export default () => GoToNodeHandler(utilsObj);
