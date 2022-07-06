import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime/lib/Handler';

const StartHandler: HandlerFactory<BaseNode.Start.Node> = () => ({
  canHandle: (node) => (Object.keys(node).length === 2 || node.type === 'start') && !!node.nextId,
  handle: (node, runtime, variables) => {
    runtime.trace.debug('beginning flow', BaseNode.NodeType.START);
    runtime.debugLogging.recordGlobalLog(RuntimeLogs.Kinds.GlobalLogKind.CONVERSATION_START, {
      userID: variables.get('user_id')!,
      versionID: runtime.versionID,
    });
    runtime.debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.START, node, {});
    return node.nextId ?? null;
  },
});

export default StartHandler;
