import { BaseNode, BaseTrace } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime/lib/Handler';
import { Action } from '@/runtime/lib/Runtime';

import { StorageType } from '../types';
import CommandHandler from './command';

const utilsObj = {
  commandHandler: CommandHandler(),
};

const GoToHandler: HandlerFactory<BaseNode.GoTo.Node, typeof utilsObj> = (utils) => ({
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

    const commandOptions = { diagramID: node.diagramID || undefined };

    // check if there is a command in the stack that fulfills request
    if (utils.commandHandler.canHandle(runtime, commandOptions)) {
      return utils.commandHandler.handle(runtime, variables, commandOptions);
    }

    return node.noMatch?.nodeID || null;
  },
});

export default GoToHandler;
