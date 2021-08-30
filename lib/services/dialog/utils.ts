/* eslint-disable no-restricted-syntax */
import { BaseNode, IntentInput, PrototypeModel } from '@voiceflow/api-sdk';
import { Node, Request } from '@voiceflow/base-types';
import { SLOT_REGEXP } from '@voiceflow/common';
// import { Node } from '@voiceflow/general-types';
import * as crypto from 'crypto';
import _ from 'lodash';

import CommandHandler from '@/lib/services/runtime/handlers/command';
import { findEventMatcher } from '@/lib/services/runtime/handlers/event';
import { Action, Store } from '@/runtime';
import Client from '@/runtime/lib/Client';
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

export const getUnfulfilledEntity = (intentRequest: Request.IntentRequest, model: PrototypeModel) => {
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

// create a dictionary of all entities from Entity[] => { [entity.name]: entity.value }
export const getEntitiesMap = (intentRequest: Request.IntentRequest): Record<string, string> =>
  intentRequest.payload.entities.reduce<Record<string, string>>(
    (acc, entity) => ({ ...acc, ...(entity.value && { [entity.name]: entity.value }) }),
    {}
  );

// Populates all entities in a given string
export const fillStringEntities = (input = '', intentRequest: Request.IntentRequest) => {
  const entityMap = getEntitiesMap(intentRequest);

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

export const isInteractionsInNode = (
  node: BaseNode & { interactions?: Node.Interaction.NodeInteraction[] }
): node is BaseNode & { interactions: Node.Interaction.NodeInteraction[] } => Array.isArray(node.interactions);

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

  if (runtime.getAction() === Action.RESPONSE || !node) return false;

  // if no event handler can handle, intent req is out of scope => no dialog management required
  if (!eventHandlers.find((h) => h.canHandle(node as any, runtime, variables, program!))) return false;

  if (isInteractionsInNode(node)) {
    // if interaction node - check if req intent matches one of the node intents
    for (const interaction of node.interactions) {
      const { event } = interaction;

      if (findEventMatcher({ event, runtime, variables })) {
        return true;
      }
    }
  }

  return false;
};

interface Utterance {
  text: string;
  slots?: string[];
}

export const sampleUtterance = (utterances: Utterance[], model: PrototypeModel, index = 0) => {
  let slotMap: Record<string, string> = {};

  const utterance =
    // ensure every slot in the utterance can be filled with a dummy value
    utterances.find(({ slots = [] }) => {
      let i = index;
      slotMap = {};

      return slots.every((utteranceSlot) => {
        // find an random sample for each slot in the intent
        const slot = model.slots.find(({ key }) => key === utteranceSlot);
        const sample = slot?.inputs[i % slot.inputs.length]?.split(',')[0];
        if (!sample) return false;

        i++;
        slotMap[slot!.name] = sample;

        return true;
      });
    })?.text;

  return utterance ? replaceSlots(utterance, slotMap).trim() : '';
};

// generate multiple buttons with slot variations from provided utterances
export const generateButtonsForUtterances = (utterances: Utterance[], model: PrototypeModel, variations = 3): Request.AnyRequestButton[] => {
  const buttons: Request.AnyRequestButton[] = [];

  for (let i = 0; i < variations; i++) {
    const utterance = utterances[i % utterances.length];

    if (utterance) {
      const name = sampleUtterance([utterance], model, i);

      if (name) {
        buttons.push({ name, request: { type: Request.RequestType.TEXT, payload: name } });
      }
    }
  }

  return _.uniqBy(buttons, (button) => button.name);
};
