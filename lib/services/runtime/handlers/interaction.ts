/* eslint-disable no-restricted-syntax */
import { EventType, IntentEvent, TraceType } from '@voiceflow/general-types';
import { Node, TraceFrame } from '@voiceflow/general-types/build/nodes/interaction';
import { Action, HandlerFactory } from '@voiceflow/runtime';

import { StorageType } from '../types';
import { addChipsIfExists, addRepromptIfExists } from '../utils';
import CommandHandler from './command';
import { findEventMatcher } from './event';
import NoMatchHandler from './noMatch';
import RepeatHandler from './repeat';

const utilsObj = {
  repeatHandler: RepeatHandler(),
  commandHandler: CommandHandler(),
  noMatchHandler: NoMatchHandler(),
  findEventMatcher,
  addChipsIfExists,
  addRepromptIfExists,
};

export const InteractionHandler: HandlerFactory<Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => !!node.interactions,
  handle: (node, runtime, variables) => {
    if (runtime.getAction() === Action.RESPONSE) {
      utils.addRepromptIfExists(node, runtime, variables);

      if (!utils.addChipsIfExists(node, runtime, variables)) {
        runtime.trace.addTrace<TraceFrame>({
          type: TraceType.CHOICE,
          payload: {
            choices: node.interactions.reduce<{ name: string; intent?: string }[]>((acc, interaction) => {
              if (interaction?.event?.type === EventType.INTENT) {
                const { intent } = interaction.event as IntentEvent;
                acc.push({ intent, name: intent });
              }
              return acc;
            }, []),
          },
        });
      }

      // clean up no matches counter on new interaction
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    // request for this turn has been processed, set action to response
    runtime.setAction(Action.RESPONSE);

    for (const interaction of node.interactions) {
      const { event, nextId } = interaction;

      const matcher = utils.findEventMatcher({ event, runtime, variables });
      if (matcher) {
        // allow handler to apply side effects
        matcher.sideEffect();
        return nextId || null;
      }
    }

    // check if there is a command in the stack that fulfills request
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }
    if (utils.repeatHandler.canHandle(runtime)) {
      return utils.repeatHandler.handle(runtime);
    }

    // check for noMatches to handle
    if (utils.noMatchHandler.canHandle(node, runtime)) {
      return utils.noMatchHandler.handle(node, runtime, variables);
    }

    return node.elseId || null;
  },
});

export default () => InteractionHandler(utilsObj);
