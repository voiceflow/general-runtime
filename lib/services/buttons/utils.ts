import { PrototypeModel } from '@voiceflow/api-sdk';
import _ from 'lodash';

import { replaceSlots } from '../dialog/utils';

export interface Button {
  name: string;
  intent?: string;
}

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
export const generateVariations = (utterances: Utterance[], model: PrototypeModel, variations = 3): Button[] => {
  const buttons: Button[] = [];

  for (let i = 0; i < variations; i++) {
    const utterance = utterances[i % utterances.length];

    if (utterance) {
      const name = sampleUtterance([utterance], model, i);

      if (name) {
        buttons.push({ name });
      }
    }
  }

  return _.uniqBy(buttons, (button) => button.name);
};

export const getChoiceButtons = (rawChoices: Button[], model: PrototypeModel): Button[] => {
  const buttons: Button[] = [];

  rawChoices.forEach((choice) => {
    const button: Button = { ...choice };

    // use intent to generate a sample utterance
    if (choice.intent) {
      const intent = model.intents.find(({ name }) => name === choice.intent);
      if (!intent) return;

      // order utterances by least number of slots
      const utterances = intent.inputs.sort((a, b) => (a.slots?.length || 0) - (b.slots?.length || 0));

      // find an utterance can have slots filled
      button.name = sampleUtterance(utterances, model);
    }

    if (button.name) {
      buttons.push(button);
    }
  });

  return _.uniqBy(buttons, (button) => button.name);
};
