import { BaseTrace } from '@voiceflow/base-types';
import { CompiledCaptureV3Node, CompiledNodeCaptureType, NodeType, PrototypeIntent } from '@voiceflow/dtos';

import { Action, HandlerFactory, Runtime } from '@/runtime';

import { StorageType } from '../../types';
import CommandHandler from '../command';
import NoReplyHandler, { addNoReplyTimeoutIfExistsV2 } from '../noReply';
import { entityFillingRequest, setElicit } from '../utils/entity';
import { handleListenForOtherTriggers } from './lib/handleListenForGlobalTriggers';
import { raiseCaptureV3HandlerError } from './lib/utils';

const utils = {
  addNoReplyTimeoutIfExistsV2,
  noReplyHandler: NoReplyHandler(),
  commandHandler: CommandHandler(),
};

function getIntent(intentID: string, runtime: Runtime): PrototypeIntent {
  const intent = runtime.version?.prototype?.model.intents.find((intent) => intent.name);
  if (!intent) {
    throw raiseCaptureV3HandlerError(
      `cannot find synthetic intent definition, versionID=${runtime.versionID}, intentID=${intentID}`
    );
  }
  return intent;
}

function getEntityNamesOfIntent(intent: PrototypeIntent, runtime: Runtime): string[] {
  const entityIDs = new Set(intent.slots?.map((slot) => slot.id) ?? []);
  const entitiesList = runtime.version?.prototype?.model.slots;

  if (!entitiesList) {
    throw raiseCaptureV3HandlerError(
      `executing a program with corrupt version missing entities list, versionID=${runtime.versionID}`
    );
  }

  return entitiesList.filter((entity) => entityIDs.has(entity.key)).map((entity) => entity.name);
}

export const CaptureV3Handler: HandlerFactory<CompiledCaptureV3Node, typeof utils> = (utils) => ({
  canHandle: (node) => node.type === NodeType.CAPTURE_V3,
  handle: (node, runtime, variables) => {
    if (runtime.getAction() === Action.RUNNING) {
      utils.addNoReplyTimeoutIfExistsV2(node, runtime);

      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      if (node.data.type === CompiledNodeCaptureType.SyntheticIntent) {
        const entry = Object.entries(node.data.intentCaptures)[0];

        if (!entry) {
          throw raiseCaptureV3HandlerError(
            `executing a corrupt Capture V3 step, versionID=${runtime.versionID}, nodeID=${node.id}`
          );
        }

        const [intentName, intentCapture] = entry;
        const intent = getIntent(intentCapture.intentID, runtime);
        const entityNames = getEntityNamesOfIntent(intent, runtime);

        runtime.trace.addTrace<BaseTrace.GoToTrace>({
          type: BaseTrace.TraceType.GOTO,
          payload: {
            request: setElicit(entityFillingRequest(intentName, entityNames), true),
          },
        });
      }

      return node.id;
    }

    if (utils.noReplyHandler.canHandle(runtime)) {
      return utils.noReplyHandler.handle(node, runtime, variables);
    }

    if (node.fallback.listensForOtherTriggers) {
      const result = handleListenForOtherTriggers(node, runtime, variables, utils.commandHandler);
      if (result.shouldTransfer) {
        return result.nextStepID;
      }
    }

    return null;
  },
});

export default () => CaptureV3Handler(utils);
