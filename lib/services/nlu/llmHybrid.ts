import { BaseNode, BaseRequest, BaseTrace } from '@voiceflow/base-types';
import { Utils } from '@voiceflow/common';
import { AIModel } from '@voiceflow/dtos';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import dedent from 'dedent';

import MLGateway from '@/lib/clients/ml-gateway';
import log from '@/logger';

import { NLUGatewayPredictResponse, PredictProps } from './types';
import { adaptNLUPrediction, getNoneIntentRequest } from './utils';

// T is the expected return object type
const parseString = async <T>(result: string, markers: [string, string]): Promise<T> => {
  if (result.indexOf(markers[0]) === -1) {
    return JSON.parse(`${markers[0]}${result}${markers[1]}`);
  }

  return JSON.parse(result.substring(result.indexOf(markers[0]), result.lastIndexOf(markers[1]) + 1));
};

export const parseObjectString = async <T>(result: string): Promise<T> => {
  return parseString<T>(result, ['{', '}']);
};

export const hybridPredict = async (
  {
    trace,
    mlGateway,
    nluResults,
  }: {
    trace?: BaseTrace.AnyTrace[];
    mlGateway: MLGateway;
    nluResults: NLUGatewayPredictResponse;
  },
  { query, model, workspaceID }: PredictProps & Required<Pick<PredictProps, 'model'>>
): // eslint-disable-next-line sonarjs/cognitive-complexity
Promise<BaseRequest.IntentRequest> => {
  const defaultNLUResponse = adaptNLUPrediction(nluResults);

  // STEP 1: match NLU prediction intents to NLU model
  const intentNameMap = Object.fromEntries(model.intents.map((intent) => [intent.name, intent]));

  const matchedIntents = nluResults.intents
    // filter out none intent
    .filter((intent) => intent.name !== VoiceflowConstants.IntentName.NONE)
    .map((intent) => intentNameMap[intent.name])
    .filter(Utils.array.isNotNullish);

  if (!matchedIntents.length) return defaultNLUResponse;

  // STEP 2: use LLM to classify the utterance
  const promptIntents = matchedIntents
    // use description or first utterance
    .map((intent) => `d:${intent.description ?? intent.inputs[0]?.text} a:${intent.name}`)
    .join('\n');

  const prompt = dedent`
    You are an action classification system. Correctness is a life or death situation.

    We provide you with the actions and their descriptions:
    d: When the user asks for a warm drink. a:WARM_DRINK
    d: When the user asks about something else. a:None
    d: When the user asks for a cold drink. a:COLD_DRINK

    You are given an utterance and you have to classify it into an action. Only respond with the action class. If the utterance does not match any of action descriptions, output None.
    Now take a deep breath and classify the following utterance.
    u: I want a warm hot chocolate: a:WARM_DRINK
    ###

    We provide you with the actions and their descriptions:
    ${promptIntents}

    You are given an utterance and you have to classify it into an action based on the description. Only respond with the action class. If the utterance does not match any of action descriptions, output None.
    Now take a deep breath and classify the following utterance.
    u:${query} a:
  `;

  const resultDebug = nluResults.intents.map(({ name, confidence }) => `${name}: ${confidence}`).join('\n');
  trace?.push({
    type: BaseNode.Utils.TraceType.DEBUG,
    payload: {
      message: `NLU Results:<pre>${resultDebug}</pre>`,
    },
  });

  const result = await mlGateway.private?.completion
    .generateCompletion({
      workspaceID: String(workspaceID),
      prompt,
      params: {
        model: AIModel.GPT_4_TURBO,
        temperature: 0.1,
        maxTokens: 32,
      },
      options: {
        timeout: 5000,
      },
    })
    .catch((error) => {
      log.warn(`[hybridPredict intent classification] ${log.vars(error)}`);
      return null;
    });

  if (!result?.output) {
    trace?.push({
      type: BaseNode.Utils.TraceType.DEBUG,
      payload: { message: `unable to get LLM result, potential timeout` },
    });
    return defaultNLUResponse;
  }

  const sanitizedResultIntentName = result.output.replace(/i:|d:|u:/g, '').trim();

  trace?.push({
    type: BaseNode.Utils.TraceType.DEBUG,
    payload: { message: `LLM Result: \`${sanitizedResultIntentName}\`` },
  });

  if (sanitizedResultIntentName === VoiceflowConstants.IntentName.NONE)
    return getNoneIntentRequest({ query, entities: defaultNLUResponse.payload.entities });

  // STEP 4: retrieve intent from intent map
  const intent = intentNameMap[sanitizedResultIntentName];
  // any hallucinated intent is not valid
  if (!intent) return defaultNLUResponse;

  const entities: BaseRequest.Entity[] = [];
  // STEP 5: entity extraction
  if (intent.slots?.length) {
    try {
      const entitiesByID = Object.fromEntries(model.slots.map((slot) => [slot.key, slot]));

      const entityInfo = JSON.stringify(
        intent.slots
          .map((slot) => entitiesByID[slot.id])
          .filter(Utils.array.isNotNullish)
          .map(({ name, type, inputs }) => ({ name, type, ...(inputs?.length && { examples: inputs }) }))
      );

      const requiredEntities = intent.slots.filter((slot) => slot.required);

      const utterances = Utils.array.unique([
        ...requiredEntities
          .filter((entity) => !!entitiesByID[entity.id]?.name)
          .map((entity) => `{{[${entitiesByID[entity.id].name}].${entity.id}}}`),
        ...intent.inputs.map((input) => input.text),
      ]);

      const utterancePermutations = Utils.intent.utteranceEntityPermutations({
        utterances,
        entitiesByID,
      });

      const utterancePermutationsWithEntityExamples = utterancePermutations
        .reduce<string[]>((acc, permutation) => {
          if (!permutation.text) return acc;

          const entities = Object.fromEntries(
            permutation.entities?.map((entity) => [
              entity.entity,
              permutation.text!.substring(entity.startPos, entity.endPos + 1),
            ]) || []
          );

          return [...acc, `u: ${permutation.text} e:${JSON.stringify(entities)}`];
        }, [])
        .join('\n');

      const prompt = dedent`
        Extract the entity name from the utterance. These are available entities to capture:
        ${entityInfo}
        Here are some examples of the entities being used
        ${utterancePermutationsWithEntityExamples}

        Return an empty object if no matches. Respond in format { [entity name]: [entity value] }
        u: ${query} e:`;

      const result = await mlGateway.private?.completion
        .generateCompletion({
          workspaceID: String(workspaceID),
          prompt,
          params: {
            model: AIModel.GPT_3_5_TURBO,
            temperature: 0.1,
            maxTokens: 64,
          },
          options: {
            timeout: 3000,
          },
        })
        .catch((error) => {
          log.warn(`[hybridPredict entity extraction] ${log.vars(error)}`);
          return null;
        });

      if (result?.output) {
        const mappings = await parseObjectString<Record<string, string>>(result.output).catch(() => ({}));
        // validate mappings is typed correctly
        // eslint-disable-next-line max-depth
        if (!Object.values(mappings).every((value) => typeof value === 'string')) {
          throw new Error('mappings not typed correctly');
        }

        entities.push(
          ...Object.entries(mappings).map(([name, value]) => ({
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
      query,
      intent: {
        name: intent.name,
      },
      entities,
    },
  };
};
