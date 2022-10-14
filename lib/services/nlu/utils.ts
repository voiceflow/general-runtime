import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseRequest } from '@voiceflow/base-types';
import { GoogleConstants } from '@voiceflow/google-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { match } from 'ts-pattern';

export const NONE_INTENT = VoiceflowConstants.IntentName.NONE;
export const getNoneIntentRequest = (query = ''): BaseRequest.IntentRequest => ({
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query,
    intent: {
      name: NONE_INTENT,
    },
    entities: [],
  },
});

export const mapChannelData = (data: any, platform: VoiceflowConstants.PlatformType, hasChannelIntents?: boolean) => {
  // FIXME: PROJ - Adapters
  // google/dfes intents were never given meaningful examples untill https://github.com/voiceflow/general-service/pull/379 was merged
  // this means that sometimes we might predict a VF intent when it should be a google one

  // alexa intents were given some but not exhaustive examples untill https://github.com/voiceflow/general-service/pull/379 was merged
  // this means old programs will hold VF intents, new ones wil hold channel intents
  const mapToUse = match(platform)
    .with(VoiceflowConstants.PlatformType.GOOGLE, () => GoogleConstants.VOICEFLOW_TO_GOOGLE_INTENT_MAP)
    .with(VoiceflowConstants.PlatformType.DIALOGFLOW_ES, () => GoogleConstants.VOICEFLOW_TO_GOOGLE_INTENT_MAP)
    .with(VoiceflowConstants.PlatformType.DIALOGFLOW_ES_CHAT, () => GoogleConstants.VOICEFLOW_TO_GOOGLE_INTENT_MAP)
    .with(VoiceflowConstants.PlatformType.DIALOGFLOW_ES_VOICE, () => GoogleConstants.VOICEFLOW_TO_GOOGLE_INTENT_MAP)
    .with(VoiceflowConstants.PlatformType.ALEXA, () => {
      if (hasChannelIntents) return AlexaConstants.VoiceflowToAmazonIntentMap;
      return {};
    })
    .otherwise(() => ({}));

  return {
    ...data,
    payload: {
      ...data.payload,
      intent: {
        ...data.payload.intent,
        name: mapToUse[data.payload.intent.name as VoiceflowConstants.IntentName] ?? data.payload.intent.name,
      },
    },
  };
};
