import { BaseTrace } from '@voiceflow/base-types';
import { CompiledCaptureV3Node, CompiledNodeCaptureType, NodeType } from '@voiceflow/dtos';

import { Action, HandlerFactory } from '@/runtime';

import { StorageType } from '../../types';
import CommandHandler from '../command';
import { getEntityNamesOfIntent } from '../lib/getEntityNamesOfIntent';
import { getSyntheticIntent } from '../lib/getSyntheticIntent';
import { handleListenForOtherTriggers } from '../lib/handleListenForGlobalTriggers';
import { handleNoReply } from '../lib/handleNoReply';
import NoReplyHandler, { addNoReplyTimeoutIfExistsV2 } from '../noReply';
import { EntityFillingNoMatchHandler, entityFillingRequest, setElicit } from '../utils/entity';
import { raiseCaptureV3HandlerError } from './lib/utils';

const utils = {
  addNoReplyTimeoutIfExistsV2,
  noReplyHandler: NoReplyHandler(),
  commandHandler: CommandHandler(),
  entityFillingNoMatchHandler: EntityFillingNoMatchHandler(),
};

export const CaptureV3Handler: HandlerFactory<CompiledCaptureV3Node, typeof utils> = (utils) => ({
  canHandle: (node) => node.type === NodeType.CAPTURE_V3,
  handle: async (node, runtime, variables) => {
    if (runtime.getAction() === Action.RUNNING) {
      utils.addNoReplyTimeoutIfExistsV2({ node, runtime, raiseError: raiseCaptureV3HandlerError });

      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      if (node.data.type === CompiledNodeCaptureType.SyntheticIntent) {
        const { id, data } = node;
        const { intent } = getSyntheticIntent({ id, data }, runtime);
        const entityNames = getEntityNamesOfIntent(intent, runtime, raiseCaptureV3HandlerError);

        runtime.trace.addTrace<BaseTrace.GoToTrace>({
          type: BaseTrace.TraceType.GOTO,
          payload: {
            request: setElicit(entityFillingRequest(intent.name, entityNames), true),
          },
        });
      }

      return node.id;
    }

    if (utils.noReplyHandler.canHandle(runtime)) {
      const result = await handleNoReply({
        node,
        runtime,
        variables,
        noReplyHandler: utils.noReplyHandler,
        raiseError: raiseCaptureV3HandlerError,
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

    if (node.data.type === CompiledNodeCaptureType.SyntheticIntent) {
      const request = runtime.getRequest();
      const intentName = request.payload.intent.name;
      const intentCapture = node.data.intentCaptures[intentName];
      return intentCapture.nextStepID;
    }

    return null;
  },
});

export default () => CaptureV3Handler(utils);
