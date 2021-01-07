import { PrototypeModel } from '@voiceflow/api-sdk';
import { replaceVariables } from '@voiceflow/runtime';
import _ from 'lodash';

type Chip = { name: string };
// eslint-disable-next-line import/prefer-default-export
export const getChoiceChips = (rawChoices: Chip[], model: PrototypeModel): Chip[] => {
  const chips: Chip[] = [];

  rawChoices.forEach((choice) => {
    const intent = model.intents.find(({ name }) => name === choice.name);
    if (intent) {
      // order utterances by least number of slots
      const utterances = intent.inputs.sort((a, b) => (a.slots?.length || 0) - (b.slots?.length || 0));

      // find an utterance can have slots filled
      let slotMap: Record<string, string> = {};
      const utterance = utterances.find(({ slots = [] }) => {
        slotMap = {};
        // eslint-disable-next-line no-restricted-syntax
        for (const utteranceSlot of slots) {
          // find an input sample for each slot in the intent
          const slot = model.slots.find(({ name }) => name === utteranceSlot);
          const sampleInput = _.sample(slot?.inputs || []);
          if (!sampleInput) return false;

          slotMap[slot!.name] = sampleInput;
        }
        return true;
      });

      if (utterance) {
        chips.push({ name: replaceVariables(utterance.text, slotMap) });
      }
    }
  });

  return chips;
};
