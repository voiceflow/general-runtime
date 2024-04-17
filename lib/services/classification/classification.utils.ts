import { BaseModels } from '@voiceflow/base-types';
import {
  IntentClassificationLLMSettings,
  IntentClassificationNLUSettings,
  IntentClassificationSettings,
  IntentClassificationSettingsDTO,
  PrototypeModel,
  Version,
} from '@voiceflow/dtos';
import { VoiceflowProject, VoiceflowVersion } from '@voiceflow/voiceflow-types';

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

export const isIntentClassificationSettings = (
  intentClassificationSettings?: unknown
): intentClassificationSettings is IntentClassificationSettings => {
  return IntentClassificationSettingsDTO.safeParse(intentClassificationSettings).success;
};

export const castToDTO = (
  version: VoiceflowVersion.Version,
  project: VoiceflowProject.Project
): {
  intentClassificationSettings: IntentClassificationSettings;
  intents?: PrototypeModel['intents'];
  slots?: PrototypeModel['slots'];
} => {
  const { settings, prototype } = version as unknown as Version;
  const { intents, slots } = prototype?.model ?? {};

  let intentClassificationSettings: IntentClassificationSettings;

  if (isIntentClassificationSettings(settings?.intentClassification)) {
    intentClassificationSettings = settings.intentClassification;
  } else if (project.nluSettings?.classifyStrategy === BaseModels.Project.ClassifyStrategy.VF_NLU_LLM_HYBRID) {
    // remove after migration PL-846
    intentClassificationSettings = LEGACY_LLM_INTENT_CLASSIFICATION;
  } else if (version?.platformData?.settings?.intentConfidence) {
    // remove after migration PL-846
    intentClassificationSettings = {
      type: 'nlu',
      params: { confidence: version.platformData.settings.intentConfidence },
    };
  } else {
    intentClassificationSettings = DEFAULT_NLU_INTENT_CLASSIFICATION;
  }

  return {
    intentClassificationSettings,
    intents,
    slots,
  };
};
