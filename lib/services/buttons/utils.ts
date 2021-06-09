import { PrototypeModel } from '@voiceflow/api-sdk';
import { AnyRequestButton, IntentRequestButton, isIntentRequest, RequestType } from '@voiceflow/general-types';
import _ from 'lodash';

import { replaceSlots } from '../dialog/utils';

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
export const generateVariations = (utterances: Utterance[], model: PrototypeModel, variations = 3): AnyRequestButton[] => {
  const buttons: AnyRequestButton[] = [];

  for (let i = 0; i < variations; i++) {
    const utterance = utterances[i % utterances.length];

    if (utterance) {
      const name = sampleUtterance([utterance], model, i);

      if (name) {
        buttons.push({ name, request: { type: RequestType.TEXT, payload: name } });
      }
    }
  }

  return _.uniqBy(buttons, (button) => button.name);
};

export const getChoiceButtons = (rawButtons: AnyRequestButton[], model: PrototypeModel): AnyRequestButton[] => {
  const buttons: AnyRequestButton[] = [];

  rawButtons.forEach((rawButton) => {
    const { name, request } = rawButton;

    // add all non-intent buttons or intent buttons with names
    if (!isIntentRequest(request) || name) {
      buttons.push(rawButton);

      return;
    }

    const button: IntentRequestButton = { name, request };

    const intent = model.intents.find(({ name: intentName }) => intentName === request.payload.intent.name);

    if (!intent) return;

    // order utterances by least number of slots
    const utterances = intent.inputs.sort((a, b) => (a.slots?.length || 0) - (b.slots?.length || 0));

    // find an utterance can have slots filled
    button.name = sampleUtterance(utterances, model);
    button.request.payload.query = button.name;

    if (button.name) {
      buttons.push(button);
    }
  });

  return _.uniqBy(buttons, (button) => button.name);
};
