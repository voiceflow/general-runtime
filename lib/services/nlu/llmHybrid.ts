import { BaseModels, BaseRequest, BaseUtils } from '@voiceflow/base-types';
import { Utils } from '@voiceflow/common';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import dedent from 'dedent';

import AIClient from '@/lib/clients/ai';

import { NLUGatewayPredictResponse } from './types';
import { adaptNLUPrediction } from './utils';

export const hybridPredict = async ({
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

  const matchedIntents = nluResults.intents
    // filter out none intent
    .filter((intent) => intent.name !== VoiceflowConstants.IntentName.NONE)
    .map((intent) => intentMap[intent.name])
    .filter(Utils.array.isNotNullish);

  if (!matchedIntents.length) return defaultNLUResponse;

  // STEP 2: match NLU prediction slots to NLU model
  const gpt = ai.get(BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo);

  const promptIntents = matchedIntents
    // use description or first utterance
    .map((intent) => `d:${intent.description ?? intent.inputs[0].text} i:${intent.name}`)
    .join('\n');

  const prompt = dedent`
    Here are the intents and their descriptions:
    ${promptIntents}
    d:Everything else that doesn’t match any of the above categories i:None
    u:${utterance} i:
  `;

  const result = await gpt?.generateCompletion(
    prompt,
    {
      temperature: 0.1,
      maxTokens: 32,
    },
    { context: {}, timeout: 1000 }
  );
  if (!result?.output) return defaultNLUResponse;

  const sanitizedResultIntentName = result.output.replace(/i:|d:|u:|/g, '').trim();
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
