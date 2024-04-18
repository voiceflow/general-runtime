import {
  IntentClassificationLLMSettings,
  IntentClassificationNLUSettings,
  IntentClassificationSettings,
  PrototypeModel,
  Version,
} from '@voiceflow/dtos';
import { VoiceflowVersion } from '@voiceflow/voiceflow-types';

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
  version: VoiceflowVersion.Version
): {
  settings: Version['settings'];
  intents?: PrototypeModel['intents'];
  slots?: PrototypeModel['slots'];
} => {
  const { settings, prototype } = version as unknown as Version;
  const { intents, slots } = prototype?.model ?? {};
  return {
    settings,
    intents,
    slots,
  };
};
