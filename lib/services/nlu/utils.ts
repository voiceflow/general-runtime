import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseRequest } from '@voiceflow/base-types';
import { GoogleConstants } from '@voiceflow/google-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { match } from 'ts-pattern';

export const getNoneIntentRequest = ({
  query = '',
  confidence,
}: { query?: string; confidence?: number } = {}): BaseRequest.IntentRequest => ({
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query,
    intent: {
      name: VoiceflowConstants.IntentName.NONE,
    },
    entities: [],
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
