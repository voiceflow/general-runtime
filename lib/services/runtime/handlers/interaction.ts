import { Node as BaseNode, Trace } from '@voiceflow/base-types';
import { IntentEvent } from '@voiceflow/base-types/build/node/utils';
import { Node as ChatNode } from '@voiceflow/chat-types';
import { Node as GeneralNode } from '@voiceflow/general-types';

import { Action, HandlerFactory } from '@/runtime';

import { StorageType } from '../types';
import { addButtonsIfExists, addRepromptIfExists } from '../utils';
import CommandHandler from './command';
import { findEventMatcher } from './event';
import NoMatchHandler from './noMatch';
import RepeatHandler from './repeat';

const utilsObj = {
  repeatHandler: RepeatHandler(),
  commandHandler: CommandHandler(),
  noMatchHandler: NoMatchHandler(),
  findEventMatcher,
  addButtonsIfExists,
  addRepromptIfExists,
};

export const InteractionHandler: HandlerFactory<GeneralNode.Interaction.Node | ChatNode.Interaction.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => !!node.interactions,
  handle: (node, runtime, variables, program) => {
    if (runtime.getAction() === Action.RESPONSE) {
      utils.addRepromptIfExists(node, runtime, variables);
      utils.addButtonsIfExists(node, runtime, variables);

      // clean up no matches counter on new interaction
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    // request for this turn has been processed, set action to response
    runtime.setAction(Action.RESPONSE);

    for (let i = 0; i < node.interactions.length; i++) {
      const { event, nextId } = node.interactions[i];

      const matcher = utils.findEventMatcher({ event, runtime, variables });

      if (matcher) {
        // allow handler to apply side effects
        matcher.sideEffect();

        if ((event as IntentEvent).goTo) {
          runtime.trace.addTrace<Trace.GoToTrace>({
            type: BaseNode.Utils.TraceType.GOTO,
            payload: { request: (event as IntentEvent).goTo!.request },
          });

          // stop on itself to await for new intent request coming in
          return node.id;
        }

        runtime.trace.addTrace<Trace.PathTrace>({
          type: BaseNode.Utils.TraceType.PATH,
          payload: { path: `choice:${i + 1}` },
        });

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
    if (utils.noMatchHandler.canHandle(node, runtime, variables, program)) {
      return utils.noMatchHandler.handle(node, runtime, variables, program);
    }

    runtime.trace.addTrace<Trace.PathTrace>({
      type: BaseNode.Utils.TraceType.PATH,
      payload: { path: 'choice:else' },
    });
    return node.elseId || null;
  },
});

export default () => InteractionHandler(utilsObj);
