import { BaseModels, BaseRequest, BaseUtils } from '@voiceflow/base-types';
import { Utils } from '@voiceflow/common';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import dedent from 'dedent';

import AIClient from '@/lib/clients/ai';

import { NLUGatewayPredictResponse } from './types';
import { adaptNLUPrediction } from './utils';

export const finalizeIntent = async ({
  utterance,
  nluResults,
  nluModel,
  ai,
}: {
  utterance: string;
  nluResults: NLUGatewayPredictResponse;
  nluModel: BaseModels.PrototypeModel;
  ai: AIClient;
}): Promise<BaseRequest.IntentRequest> => {
  const defaultNLUResponse = adaptNLUPrediction(nluResults);

  // STEP 1: match NLU prediction intents to NLU model
  const intentMap = nluModel.intents.reduce<Record<string, BaseModels.Intent | null>>((acc, intent) => {
    acc[intent.name] = intent;
    return acc;
  }, {});
  const matchedIntents = nluResults.intents.map((intent) => intentMap[intent.name]).filter(Utils.array.isNotNullish);
  if (matchedIntents.length < 2) return defaultNLUResponse;

  // STEP 2: match NLU prediction slots to NLU model
  const gpt = ai.get(BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo);

  const promptIntents = matchedIntents
    .filter((intent) => intent.name === VoiceflowConstants.IntentName.NONE)
    .map((intent) => `i:${intent.name} d:${intent.description}`)
    .join('\n');

  const prompt = dedent`
    Here are the intents and their descriptions:
    ${promptIntents}
    d:Everything else that doesn’t match any of the above categories i:None
    u:${utterance} i:
  `;

  const result = await gpt?.generateCompletion(prompt, {}, { context: {}, timeout: 1000 });
  if (!result?.output) return defaultNLUResponse;

  const sanitizedResultIntentName = result.output.trim().replace(/i:|d:|u:|/g, '');
  const intent = intentMap[sanitizedResultIntentName];

  if (!intent) return defaultNLUResponse;

  return {
    type: BaseRequest.RequestType.INTENT,
    payload: {
      query: utterance,
      intent: {
        name: intent.name,
      },
      entities: [],
    },
  };
};
