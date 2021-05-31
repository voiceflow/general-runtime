import { Node } from '@voiceflow/api-sdk';

import { Action, HandlerFactory, IfV2Handler } from '@/runtime';

import _V1Handler from '../_v1';
import CaptureHandler from '../capture';
import CommandHandler from '../command';
import InteractionHandler from '../interaction';

const _v1Handler = _V1Handler();
export const eventHandlers = [CaptureHandler(), InteractionHandler(), _v1Handler, IfV2Handler({ _v1: _v1Handler })];

const utilsObj = {
  commandHandler: CommandHandler(),
  eventHandlers,
};

/**
 * If request comes in but runtime nodeID is not a node that handles events (i.e, interaction, capture, _v1, etc..) =>
 * Handle it here
 */
export const PreliminaryHandler: HandlerFactory<Node<any, any>, typeof utilsObj> = (utils) => ({
  canHandle: (node, runtime, variables, program) => {
    const request = runtime.getRequest();
    return !!request && runtime.getAction() === Action.REQUEST && !utils.eventHandlers.find((h) => h.canHandle(node, runtime, variables, program));
  },
  handle: (node, runtime, variables) => {
    runtime.setAction(Action.RESPONSE);

    // check if there is a command in the stack that fulfills request
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    // return current id
    return node.id;
  },
});

export default () => PreliminaryHandler(utilsObj);
