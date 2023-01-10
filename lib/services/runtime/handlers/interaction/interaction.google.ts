/**
 * Google interaction needs to be used in favor of general interaction because
 * it doesnt use the repeat handler
 * it adds reprompts if exists
 * it handles interactions slightly different
 */
import { BaseModels, BaseNode, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory } from '@/runtime';

import { StorageType, TurnType } from '../../types';
import { addButtonsIfExists, addRepromptIfExists } from '../../utils';
import { isGooglePlatform, mapSlots } from '../../utils.google';
import CommandHandler from '../command';
import NoMatchHandler from '../noMatch';
import { addNoReplyTimeoutIfExists } from '../noReply';
import NoReplyHandler from '../noReply/noReply.google';
import { entityFillingRequest } from '../utils/entity';

const utilsObj = {
  addRepromptIfExists,
  addButtonsIfExists,
  mapSlots,
  addNoReplyTimeoutIfExists,
  commandHandler: CommandHandler(),
  noMatchHandler: NoMatchHandler(),
  noReplyHandler: NoReplyHandler(),
};

export const InteractionGoogleHandler: HandlerFactory<VoiceflowNode.Interaction.Node, typeof utilsObj> = (
  utils: typeof utilsObj
) => ({
  canHandle: (node) => isGooglePlatform(node.platform as VoiceflowConstants.PlatformType) && !!node.interactions,
  // canHandle: (node) => false,
  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle: (node, runtime, variables) => {
    const request = runtime.getRequest();
    if (runtime.getAction() === Action.RUNNING) {
      // clean up reprompt on new interaction
      runtime.storage.delete(TurnType.REPROMPT);

      utils.addButtonsIfExists(node, runtime, variables);
      utils.addRepromptIfExists(node, runtime, variables);
      utils.addNoReplyTimeoutIfExists(node, runtime);

      // clean up no matches and no replies counters on new interaction
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    let nextId: string | null | undefined;
    let variableMap: BaseModels.SlotMapping[] | null = null;

    const { slots, intent } = request.payload ?? {};
    // check if there is a choice in the node that fulfills intent
    node.interactions.forEach((choice) => {
      if (!BaseNode.Utils.isIntentEvent(choice.event)) return;

      if (choice.event.intent && choice.event.intent === intent?.name) {
        /** @deprecated this section should be removed in favor of the goto handler */
        if ((choice as any).goTo?.intentName) {
          runtime.trace.addTrace<BaseTrace.GoToTrace>({
            type: BaseNode.Utils.TraceType.GOTO,
            payload: { request: entityFillingRequest((choice as any).goTo.intentName) },
          });
          nextId = node.id;
        } else {
          variableMap = choice.event.mappings ?? null;
          nextId = choice.nextId;
        }
      }
    });

    if (variableMap && slots) {
      // map request mappings to variables
      variables.merge(utils.mapSlots({ mappings: variableMap, slots }));
    }

    if (nextId !== undefined) {
      return nextId;
    }

    // check if there is a command in the stack that fulfills intent
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    // check for no input
    if (utils.noReplyHandler.canHandle(runtime)) {
      return utils.noReplyHandler.handle(node, runtime, variables);
    }

    return utils.noMatchHandler.handle(node, runtime, variables);
  },
});

export default () => InteractionGoogleHandler(utilsObj);
