/* eslint-disable no-restricted-syntax */
import { IntentInput, PrototypeModel } from '@voiceflow/api-sdk';
import { SLOT_REGEXP } from '@voiceflow/common';
import { IntentRequest } from '@voiceflow/general-types';
import Client, { Action, Store } from '@voiceflow/runtime';
import * as crypto from 'crypto';

import CommandHandler from '@/lib/services/runtime/handlers/command';
import { findEventMatcher } from '@/lib/services/runtime/handlers/event';
import { Context } from '@/types';

import { eventHandlers } from '../runtime/handlers/state/preliminary';

export const VF_DM_PREFIX = 'dm_';

export const inputToString = ({ text, voice }: IntentInput, defaultVoice: string | null) => {
  const currentVoice = voice || defaultVoice;

  return currentVoice?.trim() ? `<voice name="${currentVoice}">${text}</voice>` : text;
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

export const isIntentInScope = async ({ data: { api }, versionID, state, request }: Context) => {
  const client = new Client({
    api,
  });

  const runtime = client.createRuntime(versionID, state, request);

  const currentFrame = runtime.stack.top();
  const program = await runtime.getProgram(currentFrame.getProgramID());
  const node = program.getNode(currentFrame.getNodeID());
  const variables = Store.merge(runtime.variables, currentFrame.variables);

  if (runtime.getAction() === Action.RESPONSE || !node) return false;
  // if no event handler can handle, intent req is out of scope => no dialog management required
  if (!eventHandlers.find((h) => h.canHandle(node as any, runtime, variables, program))) return false;

  // if interaction node - check if req intent matches one of the node intents
  for (const interaction of (node.interactions || []) as any) {
    const { event } = interaction;

    const matcher = findEventMatcher({ event, runtime, variables });
    if (matcher) {
      return true;
    }
  }

  // check if there is a command in the stack that fulfills request
  if (CommandHandler().canHandle(runtime)) {
    return true;
  }

  return false;
};
