interface PredictedSlot {
  name: string;
  value: string;
}
export interface NLUGatewayPredictResponse {
  utterance: string;
  predictedIntent: string;
  predictedSlots: PredictedSlot[];
  confidence: number;
  intents: { name: string; confidence: number }[];
}
