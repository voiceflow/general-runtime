import { VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, FunctionHandler, Handler, HandlerFactory, IfV2Handler } from '@/runtime';

import { isAlexaEventIntentRequest } from '../../../types';
import _V1Handler from '../../_v1';
import CaptureHandler from '../../capture';
import CaptureV2Handler from '../../captureV2';
import CardV2Handler from '../../cardV2';
import CarouselHandler from '../../carousel';
import CommandHandler from '../../command';
import GoToHandler from '../../goTo';
import InteractionHandler from '../../interaction';

const _v1Handler = _V1Handler();
export const eventHandlers = [
  FunctionHandler(),
  ...GoToHandler(),
  CaptureHandler(),
  ...CaptureV2Handler(),
  ...InteractionHandler(),
  ...CardV2Handler(),
  CarouselHandler(),
  _v1Handler,
  IfV2Handler({ _v1: _v1Handler }),
] as Handler[];

export const utilsObj = {
  commandHandler: CommandHandler(),
  eventHandlers,
};

/**
 * If request comes in but runtime nodeID is not a node that handles events (i.e, interaction, capture, _v1, etc..) =>
 * Handle it here
 */
export const PreliminaryHandler: HandlerFactory<VoiceflowNode.Interaction.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node, runtime, variables, program) => {
    const request = runtime.getRequest();
    return (
      !!request &&
      !isAlexaEventIntentRequest(request) &&
      runtime.getAction() === Action.REQUEST &&
      !utils.eventHandlers.find((h) => h.canHandle(node, runtime, variables, program))
    );
  },
  handle: (node, runtime, variables) => {
    // check if there is a command in the stack that fulfills request
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    // return current id
    return node.id;
  },
});

export default () => PreliminaryHandler(utilsObj);
