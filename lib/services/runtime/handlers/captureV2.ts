import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { NodeType } from '@voiceflow/base-types/build/common/node';
import { ChatNode } from '@voiceflow/chat-types';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory } from '@/runtime';

import { isIntentRequest, StorageType } from '../types';
import { addButtonsIfExists, mapEntities } from '../utils';
import CommandHandler from './command';
import NoReplyHandler, { addNoReplyTimeoutIfExists } from './noReply';
import RepeatHandler from './repeat';
import { EntityFillingNoMatchHandler, entityFillingRequest, setElicit } from './utils/entity';

const ENTIRE_RESPONSE_CONFIDENCE_THRESHOLD = 0.6;

type CaptureNode = VoiceflowNode.CaptureV2.Node | ChatNode.CaptureV2.Node;

type CaptureEntityNode = CaptureNode & {
  intent: {
    name: string;
    entities: string[];
  };
};

type CaptureEntireResponseNode = CaptureNode & {
  variable: string;
};

const isConfidenceScoreAbove = (threshold: number, confidence: number) => typeof confidence !== 'number' || confidence > threshold;

const isNodeCapturingEntity = (node: CaptureNode): node is CaptureEntityNode =>
  typeof node.intent?.name === 'string' && typeof node.intent?.entities != null;

const isNodeCapturingEntireResponse = (node: CaptureNode): node is CaptureEntireResponseNode => typeof node.variable === 'string';

const utilsObj = {
  repeatHandler: RepeatHandler(),
  noReplyHandler: NoReplyHandler(),
  commandHandler: CommandHandler(),
  addButtonsIfExists,
  addNoReplyTimeoutIfExists,
  entityFillingNoMatchHandler: EntityFillingNoMatchHandler(),
};

export const CaptureV2Handler: HandlerFactory<CaptureNode, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node.type === NodeType.CAPTURE_V2,
  handle: (node, runtime, variables) => {
    const captureIntentName = node.intent?.name;

    if (runtime.getAction() === Action.RUNNING) {
      utils.addNoReplyTimeoutIfExists(node, runtime);
      if (captureIntentName) {
        runtime.trace.addTrace<BaseTrace.GoToTrace>({
          type: BaseTrace.TraceType.GOTO,
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

    const request = runtime.getRequest();

    // If capturing the entire user response, we need a high confidence to leave to another capture step
    if (!isNodeCapturingEntireResponse(node) || isConfidenceScoreAbove(ENTIRE_RESPONSE_CONFIDENCE_THRESHOLD, request.payload?.confidence)) {
      // check if there is a command in the stack that fulfills request
      if (utils.commandHandler.canHandle(runtime)) {
        return utils.commandHandler.handle(runtime, variables);
      }
    }

    if (utils.repeatHandler.canHandle(runtime)) {
      return utils.repeatHandler.handle(runtime);
    }

    // on successful match
    if (isIntentRequest(request)) {
      const handleCapturePath = () => {
        runtime.trace.addTrace<BaseTrace.PathTrace>({
          type: BaseNode.Utils.TraceType.PATH,
          payload: { path: 'capture' },
        });
        return node.nextId ?? null;
      };

      const { query, intent } = request.payload;
      if (isNodeCapturingEntity(node) && intent.name === node.intent?.name) {
        variables.merge(
          mapEntities(
            node.intent.entities.map((slot) => ({ slot, variable: slot })),
            request.payload.entities
          )
        );
        return handleCapturePath();
      }
      if (isNodeCapturingEntireResponse(node)) {
        variables.set(node.variable, query);
        return handleCapturePath();
      }
    }

    const noMatchHandler = utils.entityFillingNoMatchHandler.handle(node, runtime, variables);
    return captureIntentName ? noMatchHandler([captureIntentName], entityFillingRequest(captureIntentName)) : noMatchHandler();
  },
});

export default () => CaptureV2Handler(utilsObj);
