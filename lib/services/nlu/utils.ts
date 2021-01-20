import { IntentRequest, RequestType } from '@voiceflow/general-types';

export const NONE_INTENT = 'None';
export const getNoneIntentRequest = (query = ''): IntentRequest => ({
  type: RequestType.INTENT,
  payload: {
    query,
    intent: {
      name: NONE_INTENT,
    },
    entities: [],
  },
});
