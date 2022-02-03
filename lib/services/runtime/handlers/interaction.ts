import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { ChatNode } from '@voiceflow/chat-types';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';

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

export const InteractionHandler: HandlerFactory<VoiceflowNode.Interaction.Node | ChatNode.Interaction.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => !!node.interactions,
  handle: (node, runtime, variables) => {
    if (runtime.getAction() === Action.RUNNING) {
      utils.addButtonsIfExists(node, runtime, variables);
      utils.addNoReplyTimeoutIfExists(node, runtime);

      // clean up no-matches and no-replies counters on new interaction
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    if (utils.noReplyHandler.canHandle(runtime)) {
      return utils.noReplyHandler.handle(node, runtime, variables);
    }

    if (runtime.storage.get(StorageType.GOTO_FROM_NODE_ID) !== node.id) {
      for (let i = 0; i < node.interactions.length; i++) {
        const { event, nextId } = node.interactions[i];

        const matcher = utils.findEventMatcher({ event, runtime, variables });
        if (!matcher) continue;

        // allow handler to apply side effects
        matcher.sideEffect();

        if (BaseNode.Utils.isIntentEvent(event) && event.goTo != null) {
          const { request } = event.goTo!;
          runtime.trace.addTrace<BaseTrace.GoToTrace>({
            type: BaseNode.Utils.TraceType.GOTO,
            payload: { request },
          });

          runtime.storage.set(StorageType.GOTO_FROM_NODE_ID, node.id);

          // stop on itself to await for new intent request coming in
          return node.id;
        }

        runtime.trace.addTrace<BaseTrace.PathTrace>({
          type: BaseNode.Utils.TraceType.PATH,
          payload: { path: `choice:${i + 1}` },
        });

        return nextId || null;
      }
    }

    runtime.storage.delete(StorageType.GOTO_FROM_NODE_ID);

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
