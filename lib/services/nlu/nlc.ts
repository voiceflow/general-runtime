import { BaseModels, BaseRequest } from '@voiceflow/base-types';
import { getUtterancesWithSlotNames } from '@voiceflow/common';
import NLC, { IIntentFullfilment, IIntentSlot } from '@voiceflow/natural-language-commander';
import { getRequired } from '@voiceflow/natural-language-commander/dist/lib/standardSlots';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import log from '@/logger';

import { getNoneIntentRequest } from './utils';

export const registerSlots = (nlc: NLC, { slots }: BaseModels.PrototypeModel, openSlot: boolean) => {
  slots.forEach((slot) => {
    try {
      if (slot.type?.value?.toLowerCase() !== 'custom' || !slot.inputs?.length) {
        if (openSlot) {
          // register catch all slot
          nlc.addSlotType({ type: slot.name, matcher: /[\S\s]*/ });
        }
      } else {
        const matcher = slot.inputs
          .flatMap((input) => input.split(','))
          .map((value) => value.trim())
          .filter(Boolean);

        nlc.addSlotType({ type: slot.name, matcher });
      }
    } catch (error) {
      log.debug(`[app] [runtime] [nlc] unable to register slot ${log.vars({ error, slot })}`);
    }
  });
};

export const registerIntents = (nlc: NLC, { slots, intents }: BaseModels.PrototypeModel) => {
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
    } catch (error) {
      log.debug(`[app] [runtime] [nlc] unable to register custom intent ${log.vars({ error, intent: intent.name })}`);
    }
  });
};

export const registerBuiltInIntents = (nlc: NLC, locale = VoiceflowConstants.Locale.EN_US) => {
  const lang = locale.slice(0, 2);
  const builtInIntents = VoiceflowConstants.DEFAULT_INTENTS_MAP[lang] || VoiceflowConstants.DEFAULT_INTENTS_MAP.en;

  builtInIntents.forEach((intent) => {
    const { name, samples } = intent;

    try {
      nlc.registerIntent({ intent: name, utterances: samples });
    } catch (error) {
      log.debug(`[app] [runtime] [nlc] unable to register built-in intent ${log.vars({ intent: name, error })}`);
    }
  });
};

export const createNLC = ({
  model,
  locale,
  openSlot,
}: {
  model: BaseModels.PrototypeModel;
  locale: VoiceflowConstants.Locale;
  openSlot: boolean;
}) => {
  const nlc = new NLC();

  registerSlots(nlc, model, openSlot);
  registerIntents(nlc, model);
  registerBuiltInIntents(nlc, locale);

  return nlc;
};

// eslint-disable-next-line default-param-last
export const nlcToIntent = (intent: IIntentFullfilment | null, query = '', confidence?: number): BaseRequest.IntentRequest =>
  (intent && {
    type: BaseRequest.RequestType.INTENT,
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
  model: BaseModels.PrototypeModel;
  locale: VoiceflowConstants.Locale;
  openSlot: boolean;
}): BaseRequest.IntentRequest => {
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
  model: BaseModels.PrototypeModel;
  locale: VoiceflowConstants.Locale;
  dmRequest: BaseRequest.IntentRequest;
}): BaseRequest.IntentRequest => {
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
