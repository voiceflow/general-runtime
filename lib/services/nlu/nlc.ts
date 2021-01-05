import { PrototypeModel } from '@voiceflow/api-sdk';
import { utils } from '@voiceflow/common';
import { IntentRequest, RequestType } from '@voiceflow/general-types';
import NLC, { IIntentSlot } from '@voiceflow/natural-language-commander';
import _ from 'lodash';

import logger from '@/logger';

const { getUtterancesWithSlotNames } = utils.intent;

export const registerSlots = (nlc: NLC, { slots }: PrototypeModel) => {
  slots.forEach((slot) => {
    try {
      if (slot.type?.value?.toLowerCase() !== 'custom') {
        nlc.addSlotType({ type: slot.name, matcher: /[\S\s]*/ });
      } else {
        const matcher = _.flatten(slot.inputs.map((input) => input.split(',')))
          .map((value) => value.trim())
          .filter(Boolean);

        nlc.addSlotType({ type: slot.name, matcher });
      }
    } catch (err) {
      logger.debug('NLC Unable To Register Slot', slot, err);
    }
  });
};

export const registerIntents = (nlc: NLC, { slots, intents }: PrototypeModel) => {
  intents.forEach((intent) => {
    const samples = getUtterancesWithSlotNames(intent.inputs, slots)
      .map((value) => value.trim())
      .filter(Boolean);

    let intentSlots: IIntentSlot[] = [];

    if (intent.slots) {
      intentSlots = intent.slots.reduce<IIntentSlot[]>((acc, intentSlot) => {
        const slot = slots.find(({ key }) => key === intentSlot.id);

        if (!slot) {
          return acc;
        }

        return [
          ...acc,
          {
            name: slot.name,
            type: slot.name,
            required: !!intentSlot.required,
          },
        ];
      }, []);
    }

    try {
      nlc.registerIntent({
        slots: intentSlots,
        intent: intent.name,
        utterances: samples,
      });
    } catch (err) {
      logger.error('NLC Unable To Register Custom Intent', intent, err);
    }
  });
};

export const handleNLCCommand = (query: string, model: PrototypeModel): null | IntentRequest => {
  const nlc = new NLC();

  registerSlots(nlc, model);

  registerIntents(nlc, model);

  const intent = nlc.handleCommand(query);

  return !intent
    ? null
    : {
        type: RequestType.INTENT,
        payload: {
          query,
          intent: { name: intent.intent },
          entities: intent.slots.map(({ name, value }) => ({ name, value: value || name })),
        },
      };
};
