import { BaseModels } from '@voiceflow/base-types';
import {
  IntentClassificationLLMSettings,
  IntentClassificationNLUSettings,
  IntentClassificationSettings,
  PrototypeModel,
  Version,
} from '@voiceflow/dtos';
import { VFNLU, VoiceflowProject, VoiceflowVersion } from '@voiceflow/voiceflow-types';

import { DEFAULT_NLU_INTENT_CLASSIFICATION, LEGACY_LLM_INTENT_CLASSIFICATION } from './classification.const';

export const isIntentClassificationNLUSettings = (
  settings: IntentClassificationSettings
): settings is IntentClassificationNLUSettings => {
  return settings.type === 'nlu';
};

export const isIntentClassificationLLMSettings = (
  settings: IntentClassificationSettings
): settings is IntentClassificationLLMSettings => {
  return settings.type === 'llm';
};

export const castToDTO = (
  version: VoiceflowVersion.Version,
  project: VoiceflowProject.Project,
  aiAllowed = true
): {
  intentClassificationSettings: IntentClassificationSettings;
  intents?: PrototypeModel['intents'];
  slots?: PrototypeModel['slots'];
} => {
  const { settings, prototype } = version as unknown as Version;
  const { intents, slots } = prototype?.model ?? {};

  const nluFallbackSettings = {
    type: 'nlu',
    params: { confidence: version.platformData.settings.intentConfidence },
  };

  const intentClassificationSettings =
    settings?.intentClassification ||
    // remove after migration PL-846
    (project.nluSettings?.classifyStrategy === BaseModels.Project.ClassifyStrategy.VF_NLU_LLM_HYBRID &&
      LEGACY_LLM_INTENT_CLASSIFICATION) ||
    // remove after migration PL-846
    (version?.platformData?.settings?.intentConfidence && nluFallbackSettings) ||
    DEFAULT_NLU_INTENT_CLASSIFICATION;

  return {
    intentClassificationSettings:
      isIntentClassificationLLMSettings(intentClassificationSettings) && aiAllowed
        ? intentClassificationSettings
        : nluFallbackSettings,
    intents,
    slots,
  };
};
