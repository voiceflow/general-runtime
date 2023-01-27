import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory } from '@/runtime';

import { StorageType } from '../../types';
import { addButtonsIfExists, isConfidenceScoreAbove } from '../../utils';
import CommandHandler from '../command';
import { findEventMatcher } from '../event';
import NoMatchHandler from '../noMatch';
import NoReplyHandler, { addNoReplyTimeoutIfExists } from '../noReply';
import RepeatHandler from '../repeat';

export const utilsObj = {
  repeatHandler: RepeatHandler(),
  commandHandler: CommandHandler(),
  noMatchHandler: NoMatchHandler(),
  noReplyHandler: NoReplyHandler(),
  findEventMatcher,
  addButtonsIfExists,
  addNoReplyTimeoutIfExists,
};

const EVENT_CONFIDENCE_THRESHOLD = 0.6;

export const InteractionHandler: HandlerFactory<VoiceflowNode.Interaction.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => !!node.interactions,
  handle: (node, runtime, variables) => {
    const runtimeAction = runtime.getAction();
    const request = runtime.getRequest();

    if (runtimeAction === Action.RUNNING) {
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

    for (let i = 0; i < node.interactions.length; i++) {
      const { event, nextId } = node.interactions[i];

      const matcher = utils.findEventMatcher({ event, runtime });
      if (!matcher) continue;
      if (!isConfidenceScoreAbove(EVENT_CONFIDENCE_THRESHOLD, request.payload?.confidence)) continue;

      // allow handler to apply side effects
      matcher.sideEffect(variables);

      /** @deprecated this section should be removed in favor of the goto handler */
      if (BaseNode.Utils.isIntentEvent(event) && (event as any).goTo != null) {
        const { request } = (event as any).goTo!;
        runtime.trace.addTrace<BaseTrace.GoToTrace>({
          type: BaseNode.Utils.TraceType.GOTO,
          payload: { request },
        });
        // stop on itself to await for new intent request coming in
        return node.id;
      }

      runtime.trace.addTrace<BaseTrace.PathTrace>({
        type: BaseNode.Utils.TraceType.PATH,
        payload: { path: `choice:${i + 1}` },
      });

      return nextId || null;
    }

    // check if there is a command in the stack that fulfills request
    if (node.intentScope !== BaseNode.Utils.IntentScope.NODE && utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    if (utils.repeatHandler.canHandle(runtime)) {
      return utils.repeatHandler.handle(runtime, variables);
    }

    return utils.noMatchHandler.handle(node, runtime, variables);
  },
});

export default () => InteractionHandler(utilsObj);
