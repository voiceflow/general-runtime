import { TraceType } from '@voiceflow/general-types';
import { Node, TraceFrame } from '@voiceflow/general-types/build/nodes/exit';

import { HandlerFactory } from '@/runtime/lib/Handler';

const EndHandler: HandlerFactory<Node> = () => ({
  canHandle: (node) => !!node.end,
  handle: (_, runtime): null => {
    runtime.stack.top().setNodeID(null);

    // pop all program frames that are already ended
    while (!runtime.stack.top().getNodeID() && !runtime.stack.isEmpty()) {
      runtime.stack.pop();
    }

    runtime.turn.set('end', true);
    runtime.trace.addTrace<TraceFrame>({ type: TraceType.END, payload: null });
    runtime.trace.debug('exiting session - saving location/resolving stack');

    runtime.end();

    return null;
  },
});

export default EndHandler;
