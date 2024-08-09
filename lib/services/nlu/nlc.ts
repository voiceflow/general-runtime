import { BaseModels, BaseRequest } from '@voiceflow/base-types';
import { getUtterancesWithSlotNames } from '@voiceflow/common';
import NLC, { IIntentFullfilment, IIntentSlot } from '@voiceflow/natural-language-commander';

import log from '@/logger';

import { dmPrefix } from '../dialog/utils';
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

export const registerIntents = (
  nlc: NLC,
  { slots, intents }: BaseModels.PrototypeModel,
  dmRequest?: BaseRequest.IntentRequestPayload
) => {
  intents.forEach((intent) => {
    const samples = getUtterancesWithSlotNames({
      slots,
      utterances: intent.inputs,
    });

    let intentSlots: IIntentSlot[] = [];

    if (intent.slots) {
      intentSlots = intent.slots.reduce<IIntentSlot[]>((acc, intentSlot) => {
        const slot = slots.find(({ key }) => key === intentSlot.id);

        if (!slot) {
          return acc;
        }

        // inject intent slot utterances as utterances
        if (intent.name === dmRequest?.intent.name && intentSlot.required) {
          const prefix = dmPrefix(intent.name);
          const dmUtterances = getUtterancesWithSlotNames({
            slots,
            utterances:
              intentSlot.dialog?.utterances.map((utterance) => ({
                text: `${prefix} ${utterance.text}`,
              })) ?? [],
          });
          // also inject entity-only utterance
          dmUtterances.push(`${prefix} {${slot.name}}`);

          // if slot is filled already add it to end of samples
          if (dmRequest.entities?.find((entity) => entity.name === slot.name)) {
            samples.push(...dmUtterances);
          } else {
            samples.unshift(...dmUtterances);
          }
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
        utterances: samples.map((value) => value.trim()).filter(Boolean),
      });
    } catch (error) {
      log.debug(`[app] [runtime] [nlc] unable to register custom intent ${log.vars({ error, intent: intent.name })}`);
    }
  });
};

export const createNLC = ({
  model,
  openSlot,
  dmRequest,
}: {
  model: BaseModels.PrototypeModel;
  openSlot: boolean;
  dmRequest?: BaseRequest.IntentRequestPayload;
}) => {
  const nlc = new NLC();

  registerSlots(nlc, model, openSlot);
  registerIntents(nlc, model, dmRequest);

  return nlc;
};

export const nlcToIntent = (intent: IIntentFullfilment | null, query = '', confidence = 1): BaseRequest.IntentRequest =>
  (intent && {
    type: BaseRequest.RequestType.INTENT,
    payload: {
      query,
      intent: { name: intent.intent },
      // only add entity if value is defined
      entities: intent.slots.reduce<{ name: string; value: string }[]>(
        (acc, { name, value }) => (value ? [...acc, { name, value }] : acc),
        []
      ),
      confidence,
    },
  }) ||
  getNoneIntentRequest({ query });

export const handleNLCCommand = ({
  query,
  model,
  openSlot = true,
  dmRequest,
}: {
  query: string;
  model: BaseModels.PrototypeModel;
  openSlot: boolean;
  dmRequest?: BaseRequest.IntentRequestPayload;
}): (IIntentFullfilment & { confidence: number }) | null => {
  const nlc = createNLC({ model, openSlot, dmRequest });

  // ensure open slot is lower than the capture step threshold
  const confidence = openSlot ? 0.5 : 1;
  const result = nlc.handleCommand(query);

  if (!result) return null;
  return {
    ...result,
    confidence,
  };
};
