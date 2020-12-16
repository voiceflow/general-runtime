import { SlotMapping } from '@voiceflow/api-sdk';
import { IntentRequest, StateRequestType, TraceType } from '@voiceflow/general-types';
import { Node, TraceFrame } from '@voiceflow/general-types/build/nodes/interaction';
import { formatIntentName, HandlerFactory } from '@voiceflow/runtime';

import { StorageType, TurnType } from '../types';
import { addRepromptIfExists, mapSlots } from '../utils';
import CommandHandler from './command';
import NoMatchHandler from './noMatch';
import RepeatHandler from './repeat';

const utilsObj = {
  mapSlots,
  repeatHandler: RepeatHandler(),
  commandHandler: CommandHandler(),
  noMatchHandler: NoMatchHandler(),
  formatIntentName,
  addRepromptIfExists,
};

export const InteractionHandler: HandlerFactory<Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => !!node.interactions,
  handle: (node, runtime, variables) => {
    const request = runtime.turn.get<IntentRequest>(TurnType.REQUEST);

    if (request?.type !== StateRequestType.INTENT) {
      utils.addRepromptIfExists(node, runtime, variables);

      runtime.trace.addTrace<TraceFrame>({
        type: TraceType.CHOICE,
        payload: { choices: node.interactions.map(({ intent }) => ({ name: intent })) },
      });

      // clean up no matches counter on new interaction
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    let nextId: string | null | undefined;
    let variableMap: SlotMapping[] | null = null;

    const { intent } = request.payload;

    // check if there is a choice in the node that fulfills intent
    node.interactions.forEach((choice, i: number) => {
      if (choice.intent && utils.formatIntentName(choice.intent) === intent.name) {
        variableMap = choice.mappings ?? null;
        nextId = node.nextIds[choice.nextIdIndex || choice.nextIdIndex === 0 ? choice.nextIdIndex : i];

        runtime.trace.debug(`matched choice **${choice.intent}** - taking path ${i + 1}`);
      }
    });

    if (variableMap && intent.slots) {
      // map request mappings to variables
      variables.merge(utils.mapSlots(variableMap, intent.slots));
    }

    // check if there is a command in the stack that fulfills intent
    if (nextId === undefined) {
      if (utils.commandHandler.canHandle(runtime)) {
        return utils.commandHandler.handle(runtime, variables);
      }
      if (utils.repeatHandler.canHandle(runtime)) {
        return utils.repeatHandler.handle(runtime);
      }
    }

    // request for this turn has been processed, delete request
    runtime.turn.delete(TurnType.REQUEST);

    // check for noMatches to handle
    if (nextId === undefined && utils.noMatchHandler.canHandle(node, runtime)) {
      return utils.noMatchHandler.handle(node, runtime, variables);
    }

    // clean up no matches counter
    runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);

    return (nextId !== undefined ? nextId : node.elseId) || null;
  },
});

export default () => InteractionHandler(utilsObj);
