import { BaseNode, BaseTrace } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime/lib/Handler';
import { Action } from '@/runtime/lib/Runtime';

import CommandHandler from '../command';

export const utilsObj = {
  commandHandler: CommandHandler(),
};

export const GoToHandler: HandlerFactory<BaseNode.GoTo.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.GOTO,
  handle: (node, runtime, variables): string | null => {
    if (runtime.getAction() === Action.RUNNING) {
      const { request } = node;
      runtime.trace.addTrace<BaseTrace.GoToTrace>({
        type: BaseNode.Utils.TraceType.GOTO,
        payload: { request },
      });

      return node.id;
    }

    // check if there is a command in the stack that fulfills request
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    return node.noMatch?.nodeID || null;
  },
});

export default () => GoToHandler(utilsObj);
