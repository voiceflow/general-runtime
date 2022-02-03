import { BaseRequest } from '@voiceflow/base-types';

export const NONE_INTENT = 'None';
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
