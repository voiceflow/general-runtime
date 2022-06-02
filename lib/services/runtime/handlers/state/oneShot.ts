import { BaseNode } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime';

import { isIntentRequest } from '../../types';
import CommandHandler from '../command';

const utilsObj = {
  commandHandler: CommandHandler(),
};

export const OneShotIntentHandler: HandlerFactory<BaseNode.Start.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node, runtime) => {
    return (
      isIntentRequest(runtime.getRequest()) && runtime.stack.getSize() <= 2 && node.type === BaseNode.NodeType.START
    );
  },
  handle: (node, runtime, variables) => {
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    // if nothing matches, just pretend that this is like a launch request
    return node.nextId || null;
  },
});

export default () => OneShotIntentHandler(utilsObj);
