import { NodeType } from '@voiceflow/general-types';
import { Node } from '@voiceflow/general-types/build/nodes/start';

import { Action, HandlerFactory } from '@/runtime';

import { isIntentRequest } from '../../types';
import CommandHandler from '../command';

const utilsObj = {
  commandHandler: CommandHandler(),
};

export const OneShotIntentHandler: HandlerFactory<Node, typeof utilsObj> = (utils) => ({
  canHandle: (node, runtime) => {
    return isIntentRequest(runtime.getRequest()) && runtime.stack.getSize() === 1 && node.type === NodeType.START;
  },
  handle: (node, runtime, variables) => {
    // request for this turn has been processed, set action to response
    runtime.setAction(Action.RESPONSE);

    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    // if nothing matches, just pretend that this is like a launch request
    return node.nextId || null;
  },
});

export default () => OneShotIntentHandler(utilsObj);
