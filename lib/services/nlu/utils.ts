import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseModels, BaseNode, BaseRequest } from '@voiceflow/base-types';
import { CommandType, EventType } from '@voiceflow/base-types/build/cjs/node/utils';
import { GoogleConstants } from '@voiceflow/google-types';
import { VoiceflowConstants, VoiceflowUtils } from '@voiceflow/voiceflow-types';
import { match } from 'ts-pattern';

import { Stack } from '@/runtime';
import { Context } from '@/types';

import { isIntentInInteraction, isIntentScopeInNode, isInteractionsInNode } from '../dialog/utils';
import RuntimeManager from '../runtime';
import { isConfidenceScoreAbove } from '../runtime/utils';
import { NLUGatewayPredictResponse, PredictProps } from './types';

export const adaptNLUPrediction = (prediction: NLUGatewayPredictResponse): BaseRequest.IntentRequest => {
  return {
    type: BaseRequest.RequestType.INTENT,
    payload: {
      query: prediction.utterance,
      intent: {
        name: prediction.predictedIntent,
      },
      entities: prediction.predictedSlots,
      confidence: prediction.confidence,
    },
  };
};

export const resolveIntentConfidence = (
  prediction: NLUGatewayPredictResponse,
  { query, platform, intentConfidence = 0.6, hasChannelIntents }: PredictProps
) => {
  let intentRequest = adaptNLUPrediction(prediction);

  const { confidence } = intentRequest.payload;
  if (typeof confidence === 'number' && !isConfidenceScoreAbove(intentConfidence, confidence)) {
    // confidence of a none intent is inverse to the confidence of the predicted intent
    intentRequest = getNoneIntentRequest({ query, confidence: 1 - confidence });
  }

  return mapChannelData(intentRequest, platform, hasChannelIntents);
};

export const getNoneIntentRequest = ({
  query = '',
  confidence,
  entities = [],
}: { query?: string; confidence?: number; entities?: BaseRequest.Entity[] } = {}): BaseRequest.IntentRequest => ({
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query,
    intent: {
      name: VoiceflowConstants.IntentName.NONE,
    },
    entities,
    confidence,
  },
});

const googleIntentMap = GoogleConstants.VOICEFLOW_TO_GOOGLE_INTENT_MAP;
// we dont want to map NONE into Fallback otherwise we might introduce issues on the dialog handler
const { None, ...alexaIntentMap } = AlexaConstants.VoiceflowToAmazonIntentMap;

export const mapChannelData = (data: any, platform?: VoiceflowConstants.PlatformType, hasChannelIntents?: boolean) => {
  // FIXME: PROJ - Adapters
  // google/dfes intents were never given meaningful examples untill https://github.com/voiceflow/general-service/pull/379 was merged
  // this means that sometimes we might predict a VF intent when it should be a google one

  // alexa intents were given some but not exhaustive examples untill https://github.com/voiceflow/general-service/pull/379 was merged
  // this means old programs will hold VF intents, new ones wil hold channel intents
  const mapToUse = match(platform)
    .with(VoiceflowConstants.PlatformType.GOOGLE, () => googleIntentMap)
    .with(VoiceflowConstants.PlatformType.ALEXA, () => {
      if (hasChannelIntents) return alexaIntentMap;
      return {};
    })
    .otherwise(() => ({}));

  return {
    ...data,
    payload: {
      ...data.payload,
      intent: {
        ...data.payload.intent,
        name:
          mapToUse[
            data.payload.intent.name as Exclude<VoiceflowConstants.IntentName, VoiceflowConstants.IntentName.NONE>
          ] ?? data.payload.intent.name,
      },
    },
  };
};

const setIntersect = (set1: Set<any>, set2: Set<any>) => new Set([...set1].filter((i) => set2.has(i)));

const getCommandLevelIntentsAndEntities = (
  stack: Stack
): { commandIntentNames: Set<string>; commandEntityNames: Set<string> } => {
  const intentCommands = stack
    .getFrames()
    .flatMap((frame) => frame.getCommands<BaseNode.Utils.AnyCommand<BaseNode.Utils.IntentEvent>>())
    .filter((command) => command.type === CommandType.JUMP && command.event.type === EventType.INTENT);

  const commandIntentNames = new Set(intentCommands.map((command) => command.event.intent));

  const commandEntityNames = new Set(
    intentCommands.flatMap((command) => command.event?.mappings ?? []).flatMap((mapping) => mapping.slot ?? [])
  );

  return { commandIntentNames, commandEntityNames };
};

const getNodeLevelIntentsAndEntities = (
  node: BaseNode.Utils.BaseNode | null
): { nodeInteractionIntentNames: Set<string>; nodeInteractionEntityNames: Set<string> } => {
  const nodeInteractionIntentNames: Set<string> = new Set();
  const nodeInteractionEntityNames: Set<string> = new Set();
  if (node && isInteractionsInNode(node)) {
    const intentInteractions = node.interactions.filter(isIntentInInteraction);

    intentInteractions
      .flatMap((interaction) => interaction.event.intent)
      .forEach((intent) => nodeInteractionIntentNames.add(intent));

    intentInteractions
      .flatMap((interaction) => interaction.event.mappings)
      .flatMap((mapping) => mapping?.slot || [])
      .forEach((entity) => nodeInteractionEntityNames.add(entity));
  }

  return { nodeInteractionIntentNames, nodeInteractionEntityNames };
};

export const getAvailableIntentsAndEntities = async (
  runtimeManager: RuntimeManager,
  context: Context
): Promise<{ availableIntents: Set<string>; availableEntities: Set<string>; bypass?: boolean }> => {
  const runtime = runtimeManager.createClient(context.data.api).createRuntime({
    versionID: context.versionID,
    state: context.state,
    request: context.request,
    version: context.version,
    project: context.project,
    timeout: 0,
  });

  // get command-level scope
  const { commandIntentNames, commandEntityNames } = getCommandLevelIntentsAndEntities(runtime.stack);

  const currentFrame = runtime.stack.top();
  const program = await runtime.getProgram(runtime.getVersionID(), currentFrame.getDiagramID());
  const node = program.getNode(currentFrame.getNodeID());

  // TODO: temporary bypass for locally scoped capture step
  // please remove this and properly fix the getAvailableIntentsAndEntities function/intent scoping
  if (
    node &&
    VoiceflowUtils.node.isCaptureV2(node) &&
    !node.intent?.name &&
    node.variable &&
    node.intentScope === BaseNode.Utils.IntentScope.NODE
  ) {
    return { availableIntents: new Set(), availableEntities: new Set(), bypass: true };
  }

  // get node-level scope
  const { nodeInteractionIntentNames, nodeInteractionEntityNames } = getNodeLevelIntentsAndEntities(node);

  // intersect scopes if necessary
  if (node && isIntentScopeInNode(node) && node.intentScope === BaseNode.Utils.IntentScope.NODE) {
    return {
      availableIntents: setIntersect(commandIntentNames, nodeInteractionIntentNames),
      availableEntities: setIntersect(commandEntityNames, nodeInteractionEntityNames),
    };
  }

  return { availableIntents: commandIntentNames, availableEntities: commandEntityNames };
};

export const isHybridLLMStrategy = (nluSettings?: BaseModels.Project.NLUSettings) =>
  nluSettings?.classifyStrategy === BaseModels.Project.ClassifyStrategy.VF_NLU_LLM_HYBRID;
