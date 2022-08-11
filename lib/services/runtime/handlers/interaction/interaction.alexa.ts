import { BaseNode } from '@voiceflow/base-types';
import { formatIntentName } from '@voiceflow/common';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory } from '@/runtime';
import { Storage, Turn } from '@/runtime/lib/constants/flags.alexa';

import { addRepromptIfExists, mapSlots } from '../../utils.alexa';
import CommandHandler from '../command/command.alexa';
import NoMatchHandler from '../noMatch/noMatch.alexa';
import RepeatHandler from '../repeat';

const utilsObj = {
  mapSlots,
  repeatHandler: RepeatHandler(),
  commandHandler: CommandHandler(),
  noMatchHandler: NoMatchHandler(),
  formatIntentName,
  addRepromptIfExists,
};

export const InteractionHandler: HandlerFactory<VoiceflowNode.Interaction.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => !!node.interactions && node.platform === VoiceflowConstants.PlatformType.ALEXA,
  handle: (node, runtime, variables) => {
    const request = runtime.getRequest();

    if (runtime.getAction() === Action.RUNNING) {
      utils.addRepromptIfExists({ node, runtime, variables });

      // clean up no matches counter on new interaction
      runtime.storage.delete(Storage.NO_MATCHES_COUNTER);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    // request for this turn has been processed, delete request
    const { intent } = request.payload;

    const index = node.interactions.findIndex(
      (choice) =>
        BaseNode.Utils.isIntentEvent(choice.event) &&
        choice.event.intent &&
        utils.formatIntentName(choice.event.intent) === intent.name
    );
    const choice = node.interactions[index];
    if (choice && BaseNode.Utils.isIntentEvent(choice.event)) {
      if (choice.event.mappings && intent.slots) {
        variables.merge(utils.mapSlots({ slots: intent.slots, mappings: choice.event.mappings }));
      }

      /** @deprecated this section should be eventually removed in favor of the goto handler */
      if ((choice as any).goTo?.intentName) {
        // TODO add delegate trace?
        // runtime.turn.set<Intent>(T.DELEGATE, createDelegateIntent((choice as any).goTo.intentName));
        return node.id;
      }

      runtime.turn.delete(Turn.REQUEST);
      return choice.nextId ?? null;
    }

    // check if there is a command in the stack that fulfills intent
    if (node.intentScope !== BaseNode.Utils.IntentScope.NODE && utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }
    if (utils.repeatHandler.canHandle(runtime)) {
      return utils.repeatHandler.handle(runtime);
    }

    // request for this turn has been processed, delete request
    runtime.turn.delete(Turn.REQUEST);

    // handle noMatch
    return utils.noMatchHandler.handle(node, runtime, variables);
  },
});

export default () => InteractionHandler(utilsObj);
