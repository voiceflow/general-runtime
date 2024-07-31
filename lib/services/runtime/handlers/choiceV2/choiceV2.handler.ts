import { CompiledChoiceV2Node, NodeType } from '@voiceflow/dtos';

import { Action, HandlerFactory } from '@/runtime';

import { StorageType } from '../../types';
import { raiseCaptureV3HandlerError } from '../captureV3/lib/utils';
import CommandHandler from '../command';
import { handleListenForOtherTriggers } from '../lib/handleListenForGlobalTriggers';
import { handleNoMatch } from '../lib/handleNoMatch';
import { handleNoReply } from '../lib/handleNoReply';
import NoReplyHandler, { addNoReplyTimeoutIfExistsV2 } from '../noReply';
import { EntityFillingNoMatchHandler } from '../utils/entity';

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
        raiseError: raiseCaptureV3HandlerError,
      });

      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      return node.id;
    }

    if (utils.noReplyHandler.canHandle(runtime)) {
      const result = await handleNoReply(node, runtime, variables, utils.noReplyHandler, raiseCaptureV3HandlerError);
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
      const { id, type, fallback } = node;
      const result = await handleNoMatch(
        intentName,
        { id, type, fallback },
        runtime,
        variables,
        utils.entityFillingNoMatchHandler
      );
      if (result.shouldTransfer) {
        return result.nextStepID;
      }
    }

    return intentCapture.nextStepID;
  },
});
