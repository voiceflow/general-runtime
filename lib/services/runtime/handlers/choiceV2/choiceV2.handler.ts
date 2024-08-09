import { CompiledChoiceV2Node, NodeType } from '@voiceflow/dtos';

import { Action, HandlerFactory } from '@/runtime';

import { StorageType } from '../../types';
import CommandHandler from '../command';
import { handleListenForOtherTriggers } from '../lib/handleListenForGlobalTriggers';
import { handleNoMatchV2 } from '../lib/handleNoMatch';
import { handleNoReplyV2 } from '../lib/handleNoReply';
import NoReplyHandler, { addNoReplyTimeoutIfExistsV2 } from '../noReply';
import { EntityFillingNoMatchHandler } from '../utils/entity';
import { raiseChoiceV2HandlerError } from './lib/utils';

const utils = {
  addNoReplyTimeoutIfExistsV2,
  noReplyHandler: NoReplyHandler(),
  commandHandler: CommandHandler(),
  entityFillingNoMatchHandler: EntityFillingNoMatchHandler(),
};

export const ChoiceV2Handler: HandlerFactory<CompiledChoiceV2Node, typeof utils> = (utils) => ({
  canHandle: (node) => node.type === NodeType.CHOICE_V2,
  handle: async (node, runtime, variables) => {
    if (runtime.getAction() === Action.RUNNING) {
      utils.addNoReplyTimeoutIfExistsV2({
        node,
        runtime,
        raiseError: raiseChoiceV2HandlerError,
      });

      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      return node.id;
    }

    if (utils.noReplyHandler.canHandle(runtime)) {
      const result = await handleNoReplyV2({
        node,
        runtime,
        variables,
        noReplyHandler: utils.noReplyHandler,
        raiseError: raiseChoiceV2HandlerError,
      });
      if (result.shouldTransfer) {
        return result.nextStepID;
      }
    }

    if (node.fallback.listensForOtherTriggers) {
      const result = handleListenForOtherTriggers(node, runtime, variables, utils.commandHandler);
      if (result.shouldTransfer) {
        return result.nextStepID;
      }
    }

    const request = runtime.getRequest();
    const intentName = request.payload.intent.name;
    const intentCapture = node.data.intentCaptures[intentName];
    if (!intentCapture) {
      const { id, type, fallback, data } = node;
      const result = await handleNoMatchV2({
        intentName,
        node: { id, type, fallback, data },
        runtime,
        variables,
        entityFillingNoMatchHandler: utils.entityFillingNoMatchHandler,
        raiseError: raiseChoiceV2HandlerError,
      });
      if (result.shouldTransfer) {
        return result.nextStepID;
      }
    }

    return intentCapture.nextStepID ?? null;
  },
});
