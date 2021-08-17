import { Request } from '@voiceflow/base-types';

export const NONE_INTENT = 'None';
export const getNoneIntentRequest = (query = ''): Request.IntentRequest => ({
  type: Request.RequestType.INTENT,
  payload: {
    query,
    intent: {
      name: NONE_INTENT,
    },
    entities: [],
  },
});
