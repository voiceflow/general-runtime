import { PrototypeIntent, PrototypeSlot } from '@voiceflow/dtos';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

export interface NLUIntentPrediction {
  utterance: string;
  predictedIntent: string;
  predictedSlots: PredictedSlot[];
  confidence: number;
  intents: PredictedIntent[];
}

export interface Prediction {
  utterance: string;
  predictedIntent: string;
  predictedSlots: PredictedSlot[];
  confidence: number;
}

export interface PredictError {
  message: string;
}

export interface ClassificationResult {
  result: 'llm' | 'nlu' | 'nlc';
  utterance: string;
  nlc: Partial<{
    predictedIntent: string;
    predictedSlots: PredictedSlot[];
    confidence: number;
    openSlot: boolean;
  }> & { error?: PredictError };
  nlu: Partial<{
    predictedIntent: string;
    predictedSlots: PredictedSlot[];
    confidence: number;
    intents: PredictedIntent[];
  }> & { error?: PredictError };
  llm: Partial<{
    predictedIntent: string;
    predictedSlots: PredictedSlot[];
    confidence: number;
    model: string;
    multiplier: number;
    tokens: number;
  }> & { error?: PredictError };
  fillSlots: PredictedSlot[] | { error: PredictError };
}

export interface PredictedIntent {
  name: string;
  confidence: number;
}

export interface PredictedSlot {
  name: string;
  value: string;
}

export interface PredictRequest {
  intents: PrototypeIntent[];
  slots?: PrototypeSlot[];
  tag: string;
  versionID: string;
  workspaceID: string;
}

export interface PredictOptions {
  filteredIntents?: string[];
  filteredEntities?: string[];
  // Legacy options for NLC
  hasChannelIntents?: boolean;
  locale: VoiceflowConstants.Locale;
  platform: VoiceflowConstants.PlatformType;
}

export interface NLUPredictOptions {
  filteredIntents?: string[];
  filteredEntities?: string[];
}
