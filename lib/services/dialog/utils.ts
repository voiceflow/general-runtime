/* eslint-disable no-restricted-syntax */
import { BaseModels, BaseNode, BaseRequest } from '@voiceflow/base-types';
import { SLOT_REGEXP, VF_DM_PREFIX } from '@voiceflow/common';
import * as crypto from 'crypto';

import CommandHandler from '@/lib/services/runtime/handlers/command';
import { findEventMatcher } from '@/lib/services/runtime/handlers/event';
import { Action, Store } from '@/runtime';
import Client from '@/runtime/lib/Client';
import { Context } from '@/types';

import { eventHandlers } from '../runtime/handlers/state/preliminary';

export const inputToString = ({ text, voice }: BaseModels.IntentInput, defaultVoice: string | null) => {
  const currentVoice = voice || defaultVoice;

  return currentVoice?.trim() ? `<voice name="${currentVoice}">${text}</voice>` : text;
};

export const getSlotNameByID = (id: string, model: BaseModels.PrototypeModel) => {
  return model.slots.find((lmEntity) => lmEntity.key === id)?.name;
};

export const getUnfulfilledEntity = (
  intentRequest: BaseRequest.IntentRequest,
  model: BaseModels.PrototypeModel
): (BaseModels.IntentSlot & { name: string }) | null => {
  const intentModelSlots = model.intents.find((intent) => intent.name === intentRequest.payload.intent.name)?.slots || [];
  const extractedEntityNames = new Set(intentRequest.payload.entities.map((entity) => entity.name));

  for (const modelIntentEntity of intentModelSlots) {
    if (modelIntentEntity.required) {
      const entityName = getSlotNameByID(modelIntentEntity.id, model);
      // If the required model intent entity is not found in the extracted entity, this is the entity model to return
      if (entityName && !extractedEntityNames.has(entityName)) {
        return { ...modelIntentEntity, name: entityName };
      }
    }
  }

  return null;
};

// replace all found entities with their value, if no value, empty string
// "inner" refers to the "slotname" of {{[slotname].slotid}}
export const replaceSlots = (input: string, variables: Record<string, string>) =>
  input.replace(SLOT_REGEXP, (_match, inner) => variables[inner] || '');

// create a dictionary of all entities from Entity[] => { [entity.name]: entity.value }
export const getEntitiesMap = (intentRequest: BaseRequest.IntentRequest): Record<string, string> =>
  intentRequest.payload.entities.reduce<Record<string, string>>(
    (acc, entity) => ({ ...acc, ...(entity.value && { [entity.name]: entity.value }) }),
    {}
  );

// Populates all entities in a given string
export const fillStringEntities = (input: string | undefined, intentRequest: BaseRequest.IntentRequest) => {
  const inputValue = input ?? '';
  const entityMap = getEntitiesMap(intentRequest);

  return replaceSlots(inputValue, entityMap);
};

export const dmPrefix = (contents: string) => crypto.createHash('sha256').update(contents).digest('hex').slice(-10);

/** @deprecated we compare entity subsets directly for now, if nothing is filled, it might as well be a fallback */
export const getDMPrefixIntentName = (intentName: string) => {
  return `${VF_DM_PREFIX}${dmPrefix(intentName)}_${intentName}`;
};

export const getIntentEntityList = (intentName: string, model: BaseModels.PrototypeModel) => {
  const intentModel = model.intents.find((intent) => intent.name === intentName);
  const intentEntityIDs = intentModel?.slots?.map((entity) => entity.id);
  return intentEntityIDs?.map((id) => model.slots.find((entity) => entity.key === id));
};

export const isInteractionsInNode = (
  node: BaseModels.BaseNode & { interactions?: BaseNode.Interaction.NodeInteraction[] }
): node is BaseModels.BaseNode & { interactions: BaseNode.Interaction.NodeInteraction[] } => Array.isArray(node.interactions);

export const isIntentInNode = (
  node: BaseModels.BaseNode & { intent?: { name?: string } }
): node is BaseModels.BaseNode & { intent: { name: string } } => typeof node.intent?.name === 'string';

export const isIntentInScope = async ({ data: { api }, versionID, state, request }: Context) => {
  const client = new Client({
    api,
  });

  const runtime = client.createRuntime(versionID, state, request);

  // check if there is a command in the stack that fulfills request
  if (CommandHandler().canHandle(runtime)) {
    return true;
  }

  const currentFrame = runtime.stack.top();
  const program = await runtime.getProgram(currentFrame?.getProgramID()).catch(() => null);
  const node = program?.getNode(currentFrame.getNodeID());
  const variables = Store.merge(runtime.variables, currentFrame.variables);

  if (runtime.getAction() === Action.RUNNING || !node) return false;

  // if no event handler can handle, intent req is out of scope => no dialog management required
  if (!eventHandlers.find((h) => h.canHandle(node as any, runtime, variables, program!))) return false;

  if (isIntentInNode(node) && runtime.getRequest().payload?.intent?.name === node.intent.name) {
    return true;
  }
  if (isInteractionsInNode(node)) {
    // if interaction node - check if req intent matches one of the node intents
    for (const interaction of node.interactions) {
      const { event } = interaction;

      if (findEventMatcher({ event, runtime })) {
        return true;
      }
    }
  }

  return false;
};
