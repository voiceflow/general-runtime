import { BaseModels, BaseNode, BaseRequest, BaseTrace, BaseUtils } from '@voiceflow/base-types';
import { Utils } from '@voiceflow/common';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import dedent from 'dedent';

import AIClient from '@/lib/clients/ai';
import log from '@/logger';

import { NLUGatewayPredictResponse } from './types';
import { adaptNLUPrediction, getNoneIntentRequest } from './utils';

// T is the expected return object type
const parseString = <T>(result: string, markers: [string, string]): T => {
  if (result.indexOf(markers[0]) === -1) {
    return JSON.parse(`${markers[0]}${result}${markers[1]}`);
  }

  return JSON.parse(result.substring(result.indexOf(markers[0]), result.lastIndexOf(markers[1]) + 1));
};

export const parseObjectString = <T>(result: string): T => {
  return parseString<T>(result, ['{', '}']);
};

export const hybridPredict = async ({
  utterance,
  nluResults,
  nluModel,
  ai,
  trace,
}: {
  utterance: string;
  nluResults: NLUGatewayPredictResponse;
  nluModel: BaseModels.PrototypeModel;
  ai: AIClient;
  trace?: BaseTrace.AnyTrace[];
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

  // STEP 2: use LLM to classify the utterance
  const gpt = ai.get(BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo);

  const promptIntents = matchedIntents
    // use description or first utterance
    .map((intent) => `d:${intent.description ?? intent.inputs[0].text} i:${intent.name}`)
    .join('\n');

  const intentNames = JSON.stringify(matchedIntents.map((intent) => intent.name));

  const prompt = dedent`
    You are a NLU classification system. You are given an utterance and you have to classify it into one of the following intents which have their intent names:
    ${intentNames}
    Only respond with the intent name. If the intent does not match any of intents, output None. Lean to None if its unclear.
    Here are the intents and their descriptions:
    ${promptIntents}
    d:Everything else that doesn’t match any of the above categories i:None
    u:${utterance} i:
  `;

  const resultDebug = nluResults.intents.map(({ name, confidence }) => `${name}: ${confidence}`).join('\n');
  trace?.push({
    type: BaseNode.Utils.TraceType.DEBUG,
    payload: {
      message: `NLU Results:<pre>${resultDebug}</pre>`,
    },
  });

  const result = await gpt?.generateCompletion(
    prompt,
    {
      temperature: 0.1,
      maxTokens: 32,
    },
    { context: {}, timeout: 1000 }
  );
  if (!result?.output) {
    trace?.push({
      type: BaseNode.Utils.TraceType.DEBUG,
      payload: { message: `unable to get LLM result, potential timeout` },
    });
    return defaultNLUResponse;
  }

  const sanitizedResultIntentName = result.output.replace(/i:|d:|u:|/g, '').trim();

  trace?.push({
    type: BaseNode.Utils.TraceType.DEBUG,
    payload: { message: `LLM Result: \`${sanitizedResultIntentName}\`` },
  });

  if (sanitizedResultIntentName === VoiceflowConstants.IntentName.NONE) return getNoneIntentRequest();

  // STEP 4: retrieve intent from intent map
  const intent = intentMap[sanitizedResultIntentName];
  // any hallucinated intent is not valid
  if (!intent) return defaultNLUResponse;

  const entities: BaseRequest.Entity[] = [];

  // STEP 5: entity extraction
  if (intent.slots?.length) {
    const entitiesByID = nluModel.slots.reduce<Record<string, BaseModels.Slot>>((acc, slot) => {
      acc[slot.key] = slot;
      return acc;
    }, {});

    const entityNames = JSON.stringify(
      intent.slots
        .map((slot) => entitiesByID[slot.id])
        .filter(Utils.array.isNotNullish)
        .map((slot) => slot.name)
    );

    const utterancePermutations = Utils.intent.utteranceEntityPermutations({
      utterances: intent.inputs.map((input) => input.text),
      entitiesByID,
    });

    const utterancePermutationsWithEntityExamples = utterancePermutations
      .reduce<string[]>((acc, permutation) => {
        if (!permutation.entities?.length || !permutation.text) return acc;

        const entities = Object.fromEntries(
          permutation.entities.map((entity) => [
            entity.entity,
            permutation.text!.substring(entity.startPos, entity.endPos + 1),
          ])
        );

        return [...acc, `u: ${permutation.text} e:${JSON.stringify(entities)}`];
      }, [])
      .join('\n');

    const prompt = dedent`
      Extract the entity name from the utterance. These are available entities to capture:
      ${entityNames}
      Here are some examples of the entities being used
      ${utterancePermutationsWithEntityExamples}
      u: ${utterance} e:`;

    const result = await gpt?.generateCompletion(
      prompt,
      {
        temperature: 0.1,
        maxTokens: 64,
      },
      { context: {}, timeout: 3000 }
    );

    try {
      if (result?.output) {
        entities.push(
          ...Object.entries(parseObjectString<Record<string, string>>(result.output)).map(([name, value]) => ({
            name,
            value,
          }))
        );
        trace?.push({
          type: BaseNode.Utils.TraceType.DEBUG,
          payload: { message: `LLM entity extraction: ${JSON.stringify(entities)}` },
        });
      }
    } catch (error) {
      log.warn(`[hybridPredict] ${log.vars(error)}`);
      trace?.push({
        type: BaseNode.Utils.TraceType.DEBUG,
        payload: { message: `unable to parse LLM entity result: ${log.vars(error)}` },
      });
    }
  }

  return {
    type: BaseRequest.RequestType.INTENT,
    payload: {
      query: utterance,
      intent: {
        name: intent.name,
      },
      entities,
    },
  };
};
