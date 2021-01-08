import { PrototypeModel } from '@voiceflow/api-sdk';
import _ from 'lodash';

import { replaceVariables } from '../dialog/utils';

type Chip = { intent?: string; name: string };
type Utterance = { text: string; slots?: string[] };

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

  return utterance ? replaceVariables(utterance, slotMap).trim() : '';
};

// generate multiple chips with slot variations from provided utterances
export const generateVariations = (utterances: Utterance[], model: PrototypeModel, variations = 3): Chip[] => {
  const chips: Chip[] = [];

  for (let i = 0; i < variations; i++) {
    const utterance = utterances[i % utterances.length];
    if (utterance) {
      const name = sampleUtterance([utterance], model, i);

      if (name) {
        chips.push({ name });
      }
    }
  }

  return _.uniqBy(chips, (chip) => chip.name);
};

export const getChoiceChips = (rawChoices: Chip[], model: PrototypeModel): Chip[] => {
  const chips: Chip[] = [];

  rawChoices.forEach((choice) => {
    const chip: Chip = { ...choice };

    // use intent to generate a sample utterance
    if (choice.intent) {
      const intent = model.intents.find(({ name }) => name === choice.intent);
      if (!intent) return;

      // order utterances by least number of slots
      const utterances = intent.inputs.sort((a, b) => (a.slots?.length || 0) - (b.slots?.length || 0));

      // find an utterance can have slots filled
      chip.name = sampleUtterance(utterances, model);
    }

    if (chip.name) {
      chips.push(chip);
    }
  });

  return _.uniqBy(chips, (chip) => chip.name);
};
