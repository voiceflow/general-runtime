import { DEFAULT_INTENT_CLASSIFICATION_PROMPT_WRAPPER_CODE } from '@voiceflow/default-prompt-wrappers';
import {
  AIModel,
  IntentClassificationLLMSettings,
  IntentClassificationNLUSettings,
  IntentClassificationType,
} from '@voiceflow/dtos';

export const DEFAULT_NLU_INTENT_CLASSIFICATION: IntentClassificationNLUSettings = {
  type: IntentClassificationType.NLU,
  params: { confidence: 0.6 },
};

// can be removed after migration PL-846
export const LEGACY_LLM_INTENT_CLASSIFICATION: IntentClassificationLLMSettings = {
  type: IntentClassificationType.LLM,
  params: {
    model: AIModel.GPT_4_TURBO,
    temperature: 0.1,
  },
  promptWrapper: {
    content: DEFAULT_INTENT_CLASSIFICATION_PROMPT_WRAPPER_CODE,
  },
};
