import { BaseNode, BaseTrace, RuntimeLogs } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime/lib/Handler';

const EndHandler: HandlerFactory<BaseNode.Exit.Node> = () => ({
  canHandle: (node) => !!node.end,
  handle: (node, runtime): null => {
    runtime.stack.top().setNodeID(null);

    // pop all program frames that are already ended
    while (!runtime.stack.isEmpty() && !runtime.stack.top().getNodeID()) {
      runtime.stack.pop();
    }
    runtime.turn.set('end', true);
    runtime.trace.addTrace<BaseTrace.ExitTrace>({ type: BaseNode.Utils.TraceType.END, payload: null });
    runtime.trace.debug('exiting session - saving location/resolving stack', BaseNode.NodeType.EXIT);

    const shouldLogVerbose = runtime.debugLogging.shouldLog(RuntimeLogs.LogLevel.VERBOSE);
    runtime.debugLogging.recordStepLog(
      RuntimeLogs.Kinds.StepLogKind.EXIT,
      node,
      {
        state: shouldLogVerbose ? runtime.getFinalState() : null,
      },
      shouldLogVerbose ? RuntimeLogs.LogLevel.VERBOSE : RuntimeLogs.LogLevel.INFO
    );

    runtime.end();

    return null;
  },
});

export default EndHandler;
