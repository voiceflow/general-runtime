import { BaseNode } from '@voiceflow/base-types';

import Handler from '../../Handler';
import { FunctionHandlerConfig } from './functionHandler.interface';
import { Sandbox } from './sandbox/sandbox';

export const FunctionHandler = (config: FunctionHandlerConfig): Handler<BaseNode.Code.Node> => ({
  canHandle: (node) => node.type === BaseNode.NodeType.CODE,
  handle: async (node, _runtime, variables) => {
    try {
      const { port, output } = await Sandbox.execute(node.code, variables.getState(), {
        shouldEnableInject: config.shouldInjectLog,
      });

      variables.merge(output);

      if (port === 'FAILURE') {
        return node.fail_id ?? null;
      }

      if (port) {
        const nextPath = (node.paths ?? []).find((path) => path.label === port);
        if (nextPath) {
          return nextPath.nextId ?? null;
        }
      }

      return node.success_id ?? null;
    } catch (error) {
      return node.fail_id ?? null;
    }
  },
});
