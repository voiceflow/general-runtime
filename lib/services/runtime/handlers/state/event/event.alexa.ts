import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory } from '@/runtime';

import { isAlexaEventIntentRequest } from '../../../types';
import { getCommand } from '../../command';
import CommandAlexaHandler from '../../command/command.alexa';

const commandHandler = CommandAlexaHandler();

export const EventAlexaHandlerGenerator: HandlerFactory<VoiceflowNode.Interaction.Node> = () => ({
  canHandle(node, runtime) {
    if (node.platform !== VoiceflowConstants.PlatformType.ALEXA) return false;

    const request = runtime.getRequest();
    if (!isAlexaEventIntentRequest(request)) return false;

    return runtime.getAction() === Action.REQUEST && !!getCommand(runtime);
  },

  handle: (_node, runtime, variables) => {
    if (commandHandler.canHandle(runtime)) {
      return commandHandler.handle(runtime, variables);
    }
    return null;
  },
});

export default EventAlexaHandlerGenerator;
