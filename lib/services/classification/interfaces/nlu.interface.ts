import * as DTO from '@voiceflow/dtos';
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

export interface PredictionResult {
  predictedIntent: string;
  predictedSlots: PredictedSlot[];
  confidence: number;
  error?: PredictError;
}

export interface NLCPredictionResult extends PredictionResult {
  openSlot: boolean;
}

export interface NLUPredictionResult extends PredictionResult {
  intents: PredictedIntent[];
}

export interface LLMPredictionResult extends PredictionResult {
  model: string;
  multiplier: number;
  tokens: number;
}

export interface ClassificationResult {
  result: 'llm' | 'nlu' | 'nlc';
  utterance: string;
  nlc: Partial<NLCPredictionResult>;
  nlu: Partial<NLUPredictionResult>;
  llm: Partial<LLMPredictionResult>;
  fillSlots: PredictedSlot[] | { error: PredictError };
}

export interface PredictedIntent {
  name: string;
  confidence: number;
}

export interface PredictedSlot extends Record<string, unknown> {
  name: string;
  value: string;
}

export interface PredictRequest {
  intents: PrototypeIntent[];
  slots?: PrototypeSlot[];
  tag: string;
  versionID: string;
  workspaceID: string;
  isTrained: boolean;

  // legacy
  dmRequest?: DTO.IntentRequestPayload;
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
  excludeFilteredIntents?: boolean;
  excludeFilteredEntities?: boolean;
}
