import { BaseModels, BaseRequest, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { VersionTag } from '@/types';

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

export interface PredictProps {
  query: string;
  model?: BaseModels.PrototypeModel;
  locale?: VoiceflowConstants.Locale;
  versionID: string;
  tag: VersionTag | string;
  nlp: boolean;
  hasChannelIntents: boolean;
  platform?: VoiceflowConstants.PlatformType;
  dmRequest?: BaseRequest.IntentRequestPayload;
  workspaceID: string;
  intentConfidence?: number;
  filteredIntents?: Set<string>;
  filteredEntities?: Set<string>;
  excludeFilteredIntents?: boolean;
  excludeFilteredEntities?: boolean;
  nluSettings?: BaseModels.Project.NLUSettings;
  trace?: BaseTrace.AnyTrace[];
}
