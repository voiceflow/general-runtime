import { BaseNode, BaseRequest, BaseTrace, RuntimeLogs } from '@voiceflow/base-types';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory, Runtime, Store } from '@/runtime';

import { GeneralRuntime, isIntentRequest, isTextRequest, StorageType } from '../../types';
import { addButtonsIfExists, addOutputTrace, getOutputTrace, isConfidenceScoreAbove, mapEntities } from '../../utils';
import CommandHandler from '../command';
import NoReplyHandler, { addNoReplyTimeoutIfExists } from '../noReply';
import RepeatHandler from '../repeat';
import { EntityFillingNoMatchHandler, entityFillingRequest, setElicit } from '../utils/entity';

const ENTIRE_RESPONSE_CONFIDENCE_THRESHOLD = 0.6;

type CaptureWithIntent = VoiceflowNode.CaptureV2.Node & { intent: Required<BaseNode.CaptureV2.NodeIntent> };
type CaptureWithVariable = VoiceflowNode.CaptureV2.Node & { variable: string };

export const isNodeCapturingEntity = (node: VoiceflowNode.CaptureV2.Node): node is CaptureWithIntent =>
  typeof node.intent?.name === 'string' && typeof node.intent?.entities != null && !node.variable;

export const isNodeCapturingEntireResponse = (node: VoiceflowNode.CaptureV2.Node): node is CaptureWithVariable =>
  typeof node.variable === 'string';

export const utilsObj = {
  addOutputTrace,
  getOutputTrace,
  repeatHandler: RepeatHandler(),
  noReplyHandler: NoReplyHandler(),
  commandHandler: CommandHandler(),
  addButtonsIfExists,
  addNoReplyTimeoutIfExists,
  entityFillingNoMatchHandler: EntityFillingNoMatchHandler(),
};
type utilsObjType = typeof utilsObj & {
  addPromptIfExists?: (node: VoiceflowNode.CaptureV2.Node, runtime: Runtime, variables: Store) => void;
};

export const CaptureV2Handler: HandlerFactory<VoiceflowNode.CaptureV2.Node, utilsObjType, GeneralRuntime> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.CAPTURE_V2,
  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle: async (node, runtime, variables) => {
    const incomingRequest = runtime.getRequest();

     // Classify into an intent request
     if (isTextRequest(incomingRequest)) {
      const prediction = await runtime.services.classification.predict(runtime, incomingRequest.payload, {
        filteredEntities: node.intent?.name ? [node.intent.name] : [],
      });

      if (!prediction) {

        return node.id;
      }

      runtime.setRequest({
        type: BaseRequest.RequestType.INTENT,
        payload: {
          query: prediction.utterance,
          intent: {
            name: prediction.predictedIntent,
          },
          entities: prediction.predictedSlots,
          confidence: prediction.confidence,
        },
      });
    }

    const request = runtime.getRequest();
    const captureIntentName = node.intent?.name;

    if (runtime.getAction() === Action.RUNNING) {
      utils.addNoReplyTimeoutIfExists(node, runtime);

      // when it is an alexa project, we should return the prompt for the unfulfilled entity
      if (node.platform === VoiceflowConstants.PlatformType.ALEXA && utils.addPromptIfExists) {
        utils.addPromptIfExists(node, runtime, variables);
      }

      // if (captureIntentName) {
      //   runtime.trace.addTrace<BaseTrace.GoToTrace>({
      //     type: BaseTrace.TraceType.GOTO,
      //     payload: { request: setElicit(entityFillingRequest(captureIntentName, node.intent?.entities ?? []), true) },
      //   });
      // }

      // clean up no-matches and no-replies counters on new interaction
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    if (utils.noReplyHandler.canHandle(runtime)) {
      return utils.noReplyHandler.handle(node, runtime, variables);
    }

    // If capturing the entire user response, we need a high confidence to leave to another capture step
    const lowConfidence =
      isNodeCapturingEntireResponse(node)
      && isIntentRequest(request)
      && !isConfidenceScoreAbove(ENTIRE_RESPONSE_CONFIDENCE_THRESHOLD, request.payload?.confidence);

    const isLocalScope = node.intentScope === BaseNode.Utils.IntentScope.NODE;

    // check if there is a command in the stack that fulfills request
    if (!isLocalScope && !lowConfidence && utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    if (utils.repeatHandler.canHandle(runtime)) {
      return utils.repeatHandler.handle(runtime, variables);
    }

    // on successful match
    if (isIntentRequest(request) && request.payload.intent.name === captureIntentName) {
      const { query, intent } = request.payload;

      const handleCapturePath = () => {
        runtime.trace.addTrace<BaseTrace.PathTrace>({
          type: BaseNode.Utils.TraceType.PATH,
          payload: { path: 'capture' },
        });

        return node.nextId ?? null;
      };

      if (isNodeCapturingEntity(node) && intent.name === node.intent?.name) {
        const variablesBefore: Record<string, RuntimeLogs.VariableValue | null> = Object.fromEntries(
          node.intent.entities.map((entity) => [entity, variables.get<RuntimeLogs.VariableValue>(entity) ?? null])
        );
        const variablesAfter = mapEntities(
          node.intent.entities.map((slot) => ({ slot, variable: slot })),
          request.payload.entities
        ) as Record<string, string>; // This assertion is safe because the updated value is always a string

        variables.merge(variablesAfter);
        runtime.debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.CAPTURE, node, {
          changedVariables: Object.fromEntries(
            Object.entries(variablesBefore).map(([variable, beforeValue]) => [
              variable,
              { before: beforeValue ?? null, after: variablesAfter[variable] ?? null },
            ])
          ),
        });

        return handleCapturePath();
      }

      if (isNodeCapturingEntireResponse(node)) {
        const variableBefore = variables.get<RuntimeLogs.VariableValue>(node.variable);
        variables.set(node.variable, query);
        runtime.debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.CAPTURE, node, {
          changedVariables: {
            [node.variable]: {
              before: variableBefore ?? null,
              after: query,
            },
          },
        });

        return handleCapturePath();
      }
    }

    const noMatchHandler = utils.entityFillingNoMatchHandler.handle(node, runtime, variables);

    return captureIntentName
      ? noMatchHandler([captureIntentName], entityFillingRequest(captureIntentName, node.intent?.entities))
      : noMatchHandler();
  },
});

export default () => CaptureV2Handler(utilsObj);
