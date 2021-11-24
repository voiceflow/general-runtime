import { Node as BaseNode, Trace } from '@voiceflow/base-types';
import { Node as ChatNode } from '@voiceflow/chat-types';
import { Node as GeneralNode } from '@voiceflow/general-types';

import { Action, HandlerFactory } from '@/runtime';

import { StorageType } from '../types';
import { addButtonsIfExists } from '../utils';
import CommandHandler from './command';
import { findEventMatcher } from './event';
import NoMatchHandler from './noMatch';
import NoReplyHandler, { addNoReplyTimeoutIfExists } from './noReply';
import RepeatHandler from './repeat';

const utilsObj = {
  repeatHandler: RepeatHandler(),
  commandHandler: CommandHandler(),
  noMatchHandler: NoMatchHandler(),
  noReplyHandler: NoReplyHandler(),
  findEventMatcher,
  addButtonsIfExists,
  addNoReplyTimeoutIfExists,
};

export const InteractionHandler: HandlerFactory<GeneralNode.Interaction.Node | ChatNode.Interaction.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => !!node.interactions,
  handle: (node, runtime, variables) => {
    if (runtime.getRequest() === null) {
      return utils.noReplyHandler.handle(node, runtime, variables);
    }

    if (runtime.getAction() === Action.RUNNING) {
      utils.addRepromptIfExists(node, runtime, variables);
      utils.addButtonsIfExists(node, runtime, variables);
      utils.addNoReplyTimeoutIfExists(node, runtime);

      // clean up no-matches and no-replies counters on new interaction
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    for (let i = 0; i < node.interactions.length; i++) {
      const { event, nextId } = node.interactions[i];

      const matcher = utils.findEventMatcher({ event, runtime, variables });

      if (matcher) {
        // allow handler to apply side effects
        matcher.sideEffect();

        if ((event as BaseNode.Utils.IntentEvent).goTo) {
          runtime.trace.addTrace<Trace.GoToTrace>({
            type: BaseNode.Utils.TraceType.GOTO,
            payload: { request: (event as BaseNode.Utils.IntentEvent).goTo!.request },
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

    return utils.noMatchHandler.handle(node, runtime, variables);
  },
});

export default () => InteractionHandler(utilsObj);
