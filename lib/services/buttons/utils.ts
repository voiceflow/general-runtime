import { PrototypeModel } from '@voiceflow/api-sdk';
import { IntentRequest, RequestType } from '@voiceflow/general-types';
import { TraceFrameChoice } from '@voiceflow/general-types/build/nodes/interaction';
import _ from 'lodash';

import { replaceSlots } from '../dialog/utils';

export interface ChoiceButton {
  name: string;
  request?: IntentRequest;
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
export const generateVariations = (utterances: Utterance[], model: PrototypeModel, variations = 3): ChoiceButton[] => {
  const buttons: ChoiceButton[] = [];

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

export const getChoiceButtons = (rawButtons: TraceFrameChoice[], model: PrototypeModel): ChoiceButton[] => {
  const buttons: ChoiceButton[] = [];

  rawButtons.forEach((rawButton) => {
    let intent = model.intents.find(({ key }) => key === rawButton.intent);

    // process buttons wth intents
    if (intent) {
      buttons.push({
        name: rawButton.name,
        request: {
          type: RequestType.INTENT,
          payload: {
            query: rawButton.name,
            intent: { name: intent.name },
            entities: [],
          },
        },
      });

      return;
    }

    // fallback to the choice/button name
    const button: ChoiceButton = { name: rawButton.name };

    // use intent to generate a sample utterance
    if (rawButton.intent) {
      intent = model.intents.find(({ name }) => name === rawButton.intent);

      if (!intent) return;

      // order utterances by least number of slots
      const utterances = intent.inputs.sort((a, b) => (a.slots?.length || 0) - (b.slots?.length || 0));

      // find an utterance can have slots filled
      button.name = sampleUtterance(utterances, model);
      button.request = {
        type: RequestType.INTENT,
        payload: {
          query: button.name,
          intent: { name: intent.name },
          entities: [],
        },
      };
    }

    if (button.name) {
      buttons.push(button);
    }
  });

  return _.uniqBy(buttons, (button) => button.name);
};
