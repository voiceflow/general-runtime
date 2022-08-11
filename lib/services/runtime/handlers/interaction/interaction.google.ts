import { BaseModels, BaseNode } from '@voiceflow/base-types';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory } from '@/runtime';
import { Storage, Turn } from '@/runtime/lib/constants/flags.google';

import { addButtonsIfExists } from '../../utils';
import { addRepromptIfExists, isGooglePlatform, mapSlots } from '../../utils.google';
import CommandHandler from '../command/command.google';
import NoMatchHandler from '../noMatch/noMatch.google';
import NoInputHandler from '../noReply/noReply.google';

const utilsObj = {
  addRepromptIfExists,
  addButtonsIfExists,
  mapSlots,
  commandHandler: CommandHandler(),
  noMatchHandler: NoMatchHandler(),
  noInputHandler: NoInputHandler(),
};

export const InteractionHandler: HandlerFactory<VoiceflowNode.Interaction.Node, typeof utilsObj> = (
  utils: typeof utilsObj
) => ({
  canHandle: (node) => !!node.interactions && isGooglePlatform(node.platform as VoiceflowConstants.PlatformType),
  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle: (node, runtime, variables) => {
    const request = runtime.getRequest();

    if (runtime.getAction() === Action.RUNNING) {
      // clean up reprompt on new interaction
      runtime.storage.delete(Storage.REPROMPT);

      utils.addButtonsIfExists(node, runtime, variables);
      utils.addRepromptIfExists(node, runtime, variables);

      // clean up no matches and no replies counters on new interaction
      runtime.storage.delete(Storage.NO_MATCHES_COUNTER);
      runtime.storage.delete(Storage.NO_INPUTS_COUNTER);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    let nextId: string | null | undefined;
    let variableMap: BaseModels.SlotMapping[] | null = null;

    const { slots, intent } = request.payload;

    // check if there is a choice in the node that fulfills intent
    node.interactions.forEach((choice) => {
      if (!BaseNode.Utils.isIntentEvent(choice.event)) return;

      if (choice.event.intent && choice.event.intent === intent.name) {
        /** @deprecated this section should be removed in favor of the goto handler */
        if ((choice as any).goTo) {
          runtime.turn.set(Turn.GOTO, (choice as any).goTo.intentName);
          nextId = node.id;
        } else {
          variableMap = choice.event.mappings ?? null;
          nextId = choice.nextId;
        }
      }
    });

    if (variableMap && slots) {
      // map request mappings to variables
      variables.merge(utils.mapSlots(variableMap, slots));
    }

    if (nextId !== undefined) {
      runtime.turn.delete(Turn.REQUEST);

      return nextId;
    }

    // check if there is a command in the stack that fulfills intent
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    // check for no input
    if (utils.noInputHandler.canHandle(runtime)) {
      return utils.noInputHandler.handle(node, runtime, variables);
    }

    // request for this turn has been processed, delete request
    runtime.turn.delete(Turn.REQUEST);

    return utils.noMatchHandler.handle(node, runtime, variables);
  },
});

export default () => InteractionHandler(utilsObj);
