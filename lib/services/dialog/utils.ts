import { IntentInput, PrototypeModel } from '@voiceflow/api-sdk';
import { IntentRequest } from '@voiceflow/general-types';
import { SLOT_REGEXP } from '@voiceflow/common';
import * as crypto from 'crypto';

export const VF_DM_PREFIX = 'dm_';

export const inputToString = ({ text, voice }: IntentInput) => {
  return voice?.trim() ? `<voice name="${voice}">${text}</voice>` : text;
};

export const getSlotNameByID = (id: string, model: PrototypeModel) => {
  return model.slots.find((lmEntity) => lmEntity.key === id)?.name;
};

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
export const replaceSlots = (input: string, variables: Record<string, string>) =>
  input.replace(SLOT_REGEXP, (_match, inner) => variables[inner] || '');

// Populates all entities in a given string
export const fillStringEntities = (input = '', intentRequest: IntentRequest) => {
  // create a dictionary of all entities from Entity[] => { [entity.name]: entity.value }
  const entityMap = intentRequest.payload.entities.reduce<Record<string, string>>(
    (acc, entity) => ({ ...acc, ...(entity.value && { [entity.name]: entity.value }) }),
    {}
  );

  return replaceSlots(input, entityMap);
};

export const dmPrefix = (contents: string) =>
  crypto
    .createHash('sha1')
    .update(contents)
    .digest('hex')
    .slice(-10);

export const getDMPrefixIntentName = (intentName: string) => {
  return `${VF_DM_PREFIX}${dmPrefix(intentName)}_${intentName}`;
};

export const getIntentEntityList = (intentName: string, model: PrototypeModel) => {
  const intentModel = model.intents.find((intent) => intent.name === intentName);
  const intentEntityIDs = intentModel?.slots?.map((entity) => entity.id);
  return intentEntityIDs?.map((id) => model.slots.find((entity) => entity.key === id));
};
