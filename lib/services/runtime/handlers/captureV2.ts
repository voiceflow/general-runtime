import { Node as BaseNode, Trace } from '@voiceflow/base-types';
import { NodeType } from '@voiceflow/base-types/build/common/node';
import { Node as ChatNode } from '@voiceflow/chat-types';
import { Node as GeneralNode } from '@voiceflow/general-types';

import { Action, HandlerFactory } from '@/runtime';

import { isIntentRequest, StorageType } from '../types';
import { addButtonsIfExists, mapEntities } from '../utils';
import CommandHandler from './command';
import NoReplyHandler, { addNoReplyTimeoutIfExists } from './noReply';
import RepeatHandler from './repeat';
import { EntityFillingNoMatchHandler, entityFillingRequest, setElicit } from './utils/entity';

const utilsObj = {
  repeatHandler: RepeatHandler(),
  noReplyHandler: NoReplyHandler(),
  commandHandler: CommandHandler(),
  addButtonsIfExists,
  addNoReplyTimeoutIfExists,
  entityFillingNoMatchHandler: EntityFillingNoMatchHandler(),
};

export const CaptureV2Handler: HandlerFactory<GeneralNode.CaptureV2.Node | ChatNode.CaptureV2.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node.type === NodeType.CAPTURE_V2,
  handle: (node, runtime, variables) => {
    const captureIntentName = node.intent?.name;

    if (runtime.getAction() === Action.RUNNING) {
      utils.addNoReplyTimeoutIfExists(node, runtime);
      if (captureIntentName) {
        runtime.trace.addTrace<Trace.GoToTrace>({
          type: Trace.TraceType.GOTO,
          payload: { request: setElicit(entityFillingRequest(captureIntentName), true) },
        });
      }

      // clean up no-matches and no-replies counters on new interaction
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    if (utils.noReplyHandler.canHandle(runtime)) {
      return utils.noReplyHandler.handle(node, runtime, variables);
    }

    // check if there is a command in the stack that fulfills request
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    if (utils.repeatHandler.canHandle(runtime)) {
      return utils.repeatHandler.handle(runtime);
    }

    const request = runtime.getRequest();

    // on successful match
    if (isIntentRequest(request)) {
      const { query, intent } = request.payload;
      if (intent.name === node.intent?.name && node.intent.entities) {
        variables.merge(
          mapEntities(
            node.intent.entities.map((slot) => ({ slot, variable: slot })),
            request.payload.entities
          )
        );

        runtime.trace.addTrace<Trace.PathTrace>({
          type: BaseNode.Utils.TraceType.PATH,
          payload: { path: 'capture' },
        });
        return node.nextId ?? null;
      }
      if (node.variable) {
        variables.set(node.variable, query);
        return node.nextId ?? null;
      }
    }

    const noMatchHandler = utils.entityFillingNoMatchHandler.handle(node, runtime, variables);
    return captureIntentName ? noMatchHandler([captureIntentName], entityFillingRequest(captureIntentName)) : noMatchHandler();
  },
});

export default () => CaptureV2Handler(utilsObj);
