import { PrototypeModel } from '@voiceflow/api-sdk';
import { getUtterancesWithSlotNames } from '@voiceflow/common';
import { DEFAULT_INTENTS_MAP, IntentRequest, Locale, RequestType } from '@voiceflow/general-types';
import NLC, { IIntentFullfilment, IIntentSlot } from '@voiceflow/natural-language-commander';
import { getRequired } from '@voiceflow/natural-language-commander/dist/lib/standardSlots';
import _ from 'lodash';

import logger from '@/logger';

import { getNoneIntentRequest } from './utils';

export const registerSlots = (nlc: NLC, { slots }: PrototypeModel, openSlot: boolean) => {
  slots.forEach((slot) => {
    try {
      if (slot.type?.value?.toLowerCase() !== 'custom' || !slot.inputs?.length) {
        if (openSlot) {
          // register catch all slot
          nlc.addSlotType({ type: slot.name, matcher: /[\S\s]*/ });
        }
      } else {
        const matcher = _.flatten(slot.inputs.map((input) => input.split(',')))
          .map((value) => value.trim())
          .filter(Boolean);

        nlc.addSlotType({ type: slot.name, matcher });
      }
    } catch (err) {
      logger.debug(`NLC Unable To Register Slot ${slot} ${err}`);
    }
  });
};

export const registerIntents = (nlc: NLC, { slots, intents }: PrototypeModel) => {
  intents.forEach((intent) => {
    const samples = getUtterancesWithSlotNames({ slots, utterances: intent.inputs })
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
      logger.debug(`NLC Unable To Register Custom Intent ${intent} ${err}`);
    }
  });
};

export const registerBuiltInIntents = (nlc: NLC, locale = Locale.EN_US) => {
  const lang = locale.slice(0, 2);
  const builtInIntents = DEFAULT_INTENTS_MAP[lang] || DEFAULT_INTENTS_MAP.en;

  builtInIntents.forEach((intent) => {
    const { name, samples } = intent;

    try {
      nlc.registerIntent({ intent: name, utterances: samples });
    } catch (err) {
      logger.debug(`NLC Unable To Register Built In Intent ${err}`);
    }
  });
};

export const createNLC = ({ model, locale, openSlot }: { model: PrototypeModel; locale: Locale; openSlot: boolean }) => {
  const nlc = new NLC();

  registerSlots(nlc, model, openSlot);
  registerIntents(nlc, model);
  registerBuiltInIntents(nlc, locale);

  return nlc;
};

export const nlcToIntent = (intent: IIntentFullfilment | null, query = '', confidence?: number): IntentRequest =>
  (intent && {
    type: RequestType.INTENT,
    payload: {
      query,
      intent: { name: intent.intent },
      // only add entity if value is defined
      entities: intent.slots.reduce<{ name: string; value: string }[]>((acc, { name, value }) => (value ? [...acc, { name, value }] : acc), []),
      confidence,
    },
  }) ||
  getNoneIntentRequest(query);

export const handleNLCCommand = ({
  query,
  model,
  locale,
  openSlot = true,
}: {
  query: string;
  model: PrototypeModel;
  locale: Locale;
  openSlot: boolean;
}): IntentRequest => {
  const nlc = createNLC({ model, locale, openSlot });

  return nlcToIntent(nlc.handleCommand(query), query, openSlot ? undefined : 1);
};

export const handleNLCDialog = ({
  query,
  model,
  locale,
  dmRequest,
}: {
  query: string;
  model: PrototypeModel;
  locale: Locale;
  dmRequest: IntentRequest;
}): IntentRequest => {
  const nlc = createNLC({ model, locale, openSlot: true });

  const intentName = dmRequest.payload.intent.name;
  const filledEntities = dmRequest.payload.entities;

  // turn the dmRequest into IIntentFullfilment
  const fulfillment: IIntentFullfilment = {
    intent: intentName,
    slots: filledEntities, // luckily payload.entities and ISlotFullfilment are compatible
    required: getRequired(nlc.getIntent(intentName)?.slots || [], filledEntities),
  };

  return nlcToIntent(nlc.handleDialog(fulfillment, query), query);
};
