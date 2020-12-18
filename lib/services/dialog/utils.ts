import { PrototypeModel } from '@voiceflow/api-sdk';
import { IntentRequest, RequestType } from '@voiceflow/general-types';
import * as crypto from 'crypto';

import { Context } from '@/types';

export const VF_DM_PREFIX = 'dm_';
export const VF_ENTITY_REGEXP = /{{\[(\w{1,32})\]\.\w{1,32}}}/gi;

// Create prompt response
export const prompt = (msg: string, context: Context) => {
  return {
    ...context,
    end: true,
    trace: [
      {
        type: 'speak',
        prompt: msg,
      },
    ],
  };
};

export const getSlotNameByID = (id: string, model: PrototypeModel) => {
  return model.slots.find((lmEntity) => lmEntity.key === id)?.name;
};

// Find one unfulfilled entity (if exists) on the current classified intent with the DM stored state
export const getUnfulfilledEntity = (intentRequest: IntentRequest, model: PrototypeModel) => {
  const intentModel = model.intents.find((intent) => intent.name === intentRequest.payload.intent.name);
  const extractedEntities = intentRequest.payload.entities;

  return intentModel?.slots?.find((modelIntentEntity) => {
    if (modelIntentEntity.required) {
      // If the required model intent entity is not found in the extracted entity, this is the entity model to return
      return !extractedEntities.some((extractedEntity) => extractedEntity.name === getSlotNameByID(modelIntentEntity.id, model));
    }
    return false;
  });
};

// Populates all entities in a given string
export const fillStringEntities = (input: string, intentRequest: IntentRequest) => {
  let output = input;
  // Find and replace all occurences of {slotName} in input string with the actual slot value
  let entityMatch: null | RegExpMatchArray = null;

  do {
    const entityMatches = [...output.matchAll(VF_ENTITY_REGEXP)];
    [entityMatch] = entityMatches;
    if (entityMatch) {
      const entityName = entityMatch[1]; // slot name excluding opening and closing bracket
      const extractedEntity = intentRequest.payload.entities.find((entity) => entity.name === entityName);
      let entityValue = '';
      if (extractedEntity) {
        entityValue = extractedEntity.value;
      }

      // Replace the slots with the randomly selected value.
      output = output.replace(entityMatch[0], entityValue);
    }
  } while (entityMatch);

  return output;
};

export const dmPrefix = (contents: string) =>
  crypto
    .createHash('md5')
    .update(contents)
    .digest('hex');

export const getDMPrefixIntentName = (intentName: string) => {
  return `${VF_DM_PREFIX}${dmPrefix(intentName)}_${intentName}`;
};

export const fallbackIntent = (context: Context) => {
  const incomingRequest = context.request as IntentRequest;
  const intentRequest: IntentRequest = {
    type: RequestType.INTENT,
    payload: {
      query: incomingRequest.payload.query,
      intent: {
        name: 'None',
      },
      entities: [],
    },
  };
  return {
    ...context,
    request: intentRequest,
    state: { ...context.state, storage: { ...context.state.storage, dm: undefined } },
  };
};

export const getIntentEntityList = (intentName: string, model: PrototypeModel) => {
  const intentModel = model.intents.find((intent) => intent.name === intentName);
  const intentEntityIDs = intentModel?.slots?.map((entity) => entity.id);
  return intentEntityIDs?.map((id) => model.slots.find((entity) => entity.key === id));
};
