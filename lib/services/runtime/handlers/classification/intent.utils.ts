import { getNoneIntentRequest } from "@/lib/services/nlu/utils";
import { Prediction } from "@/lib/services/predictor/interfaces/nlu.interface";
import { BaseRequest } from "@voiceflow/base-types";

export const getIntentRequest = (prediction: Prediction | null): BaseRequest.IntentRequest => {
  if (!prediction) {
    return getNoneIntentRequest();
  }

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
