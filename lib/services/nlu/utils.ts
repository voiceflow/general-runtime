import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseModels, BaseNode, BaseRequest } from '@voiceflow/base-types';
import { PrototypeModel, Version } from '@voiceflow/dtos';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { match } from 'ts-pattern';

import { Context } from '@/types';

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

// we dont want to map NONE into Fallback otherwise we might introduce issues on the dialog handler
const { None, ...alexaIntentMap } = AlexaConstants.VoiceflowToAmazonIntentMap;

export const mapChannelIntent = (
  intent: string,
  platform?: VoiceflowConstants.PlatformType,
  hasChannelIntents?: boolean
) => {
  // FIXME: PROJ - Adapters
  // google/dfes intents were never given meaningful examples untill https://github.com/voiceflow/general-service/pull/379 was merged
  // this means that sometimes we might predict a VF intent when it should be a google one

  // alexa intents were given some but not exhaustive examples untill https://github.com/voiceflow/general-service/pull/379 was merged
  // this means old programs will hold VF intents, new ones wil hold channel intents
  const mapToUse = match(platform)
    .with(VoiceflowConstants.PlatformType.ALEXA, () => {
      if (hasChannelIntents) return alexaIntentMap;
      return {};
    })
    .otherwise(() => ({}));

  return mapToUse[intent as Exclude<VoiceflowConstants.IntentName, VoiceflowConstants.IntentName.NONE>] ?? intent;
};

export const mapChannelData = (data: any, platform?: VoiceflowConstants.PlatformType, hasChannelIntents?: boolean) => {
  return {
    ...data,
    payload: {
      ...data.payload,
      intent: {
        ...data.payload.intent,
        name: mapChannelIntent(data.payload.intent.name, platform, hasChannelIntents),
      },
    },
  };
};

export const findIntent = (
  intents: PrototypeModel['intents'] | undefined,
  intentName: string | undefined
): PrototypeModel['intents'][number] | undefined => {
  const intent = intentName ? intents?.find((intent) => intent.name === intentName) : undefined;

  // Create a "None" intent if we don't have one
  if (!intent && intentName === VoiceflowConstants.IntentName.NONE) {
    return {
      inputs: [],
      name: VoiceflowConstants.IntentName.NONE,
      key: VoiceflowConstants.IntentName.NONE,
    };
  }

  return intent;
};

export const isUsedIntent = (
  usedIntents: string[] | undefined,
  intent: { key: string; name: string } | undefined
): boolean => {
  /* If we don't have a used intents array, consider it "used" for compatibility */
  const used =
    !Array.isArray(usedIntents) ||
    (!!intent &&
      /* The used intent set contains both keys and names :confused: */
      usedIntents.findIndex((used) => used === intent.key || used === intent.name) >= 0);

  // The "None" intent is considered used if it's not already in the used intents array
  if (
    !used &&
    intent?.key === VoiceflowConstants.IntentName.NONE &&
    intent?.name === VoiceflowConstants.IntentName.NONE
  ) {
    return true;
  }

  return used;
};

export const isHybridLLMStrategy = (nluSettings?: BaseModels.Project.NLUSettings) =>
  nluSettings?.classifyStrategy === BaseModels.Project.ClassifyStrategy.VF_NLU_LLM_HYBRID;

/**
 * The newer listen steps have their own classification logic,
 * so we shouldn't run the NLU or DialogManagement turn handlers.
 */
export const shouldBypassNLU = async (context: Context) => {
  const currentFrame = context.runtime.stack.top();
  const program = await context.runtime.getProgram(context.runtime.getVersionID(), currentFrame.getDiagramID());
  const node = program.getNode(currentFrame.getNodeID());

  // TODO: update with actual node type checks, probably via DTOs
  return node?.type === BaseNode.NodeType.AI_CAPTURE;
};

export const shouldDoLLMExtraction = async (context: Context): Promise<boolean> => {
  const version = (await context.data.api.getVersion(context.versionID)) as unknown as Version;
  return version.settings?.entityExtraction?.type === 'llm';
};

export const shouldDoLLMReprompt = async (context: Context) => {
  const currentFrame = context.runtime.stack.top();
  const program = await context.runtime.getProgram(context.runtime.getVersionID(), currentFrame.getDiagramID());
  const node = program.getNode(currentFrame.getNodeID());

  // TODO: update with actual node type checks, probably via DTOs
  return node?.type === 'interaction';
};
