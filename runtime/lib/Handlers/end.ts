import { BaseNode, BaseTrace } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime/lib/Handler';

const EndHandler: HandlerFactory<BaseNode.Exit.Node> = () => ({
  canHandle: (node) => !!node.end,
  handle: (_, runtime): null => {
    runtime.stack.top().setNodeID(null);

    // pop all program frames that are already ended
    while (!runtime.stack.top().getNodeID() && !runtime.stack.isEmpty()) {
      runtime.stack.pop();
    }

    runtime.turn.set('end', true);
    runtime.trace.addTrace<BaseTrace.ExitTrace>({ type: BaseNode.Utils.TraceType.END, payload: null });
    runtime.trace.debug('exiting session - saving location/resolving stack', BaseNode.NodeType.EXIT);

    runtime.end();

    return null;
  },
});

export default EndHandler;
