import { PrototypeModel } from '@voiceflow/api-sdk';
import { IntentRequest, RequestType, SLOT_REGEXP } from '@voiceflow/general-types';
import * as crypto from 'crypto';

import { Context } from '@/types';

export const VF_DM_PREFIX = 'dm_';

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

// replace all found entities with their value, if no value, empty string
// "inner" refers to the "slotname" of {{[slotname].slotid}}
export const replaceVariables = (input: string, variables: Record<string, string>) =>
  input.replace(SLOT_REGEXP, (_match, inner) => variables[inner] || '');

// Populates all entities in a given string
export const fillStringEntities = (input = '', intentRequest: IntentRequest) => {
  // create a dictionary of all entities from Entity[] => { [entity.name]: entity.value }
  const entityMap = intentRequest.payload.entities.reduce<Record<string, string>>(
    (acc, entity) => ({ ...acc, ...(entity.value && { [entity.name]: entity.value }) }),
    {}
  );

  return replaceVariables(input, entityMap);
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
