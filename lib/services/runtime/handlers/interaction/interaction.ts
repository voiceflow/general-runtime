import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory, Runtime, Store } from '@/runtime';

import { StorageType } from '../../types';
import { addButtonsIfExists } from '../../utils';
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

type utilsObjType = typeof utilsObj & {
  addNoReplyIfExists?: (node: VoiceflowNode.Interaction.Node, runtime: Runtime, variables: Store) => void;
};

export const InteractionHandler: HandlerFactory<VoiceflowNode.Interaction.Node, utilsObjType> = (utils) => ({
  canHandle: (node) => !!node.interactions,
  handle: (node, runtime, variables) => {
    const runtimeAction = runtime.getAction();

    if (runtimeAction === Action.RUNNING) {
      utils.addButtonsIfExists(node, runtime, variables);
      utils.addNoReplyTimeoutIfExists(node, runtime);

      // clean up no-matches and no-replies counters on new interaction
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      // when it is an alexa project, we should return the no reply prompt if it exists
      if (node.platform === VoiceflowConstants.PlatformType.ALEXA && utils.addNoReplyIfExists) {
        utils.addNoReplyIfExists(node, runtime, variables);
      }

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    if (runtime.getRequest()?.type === 'exit-scenario') {
      runtime.trace.addTrace<BaseTrace.PathTrace>({
        type: BaseNode.Utils.TraceType.PATH,
        payload: { path: 'choice:else' },
      });

      return '66a2ce9c853d0b588e1cb5ae';
    }

    if (utils.noReplyHandler.canHandle(runtime)) {
      return utils.noReplyHandler.handle(node, runtime, variables);
    }

    for (let i = 0; i < node.interactions.length; i++) {
      const { event, nextId } = node.interactions[i];

      const matcher = utils.findEventMatcher({ event, runtime });
      if (!matcher) continue;

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
