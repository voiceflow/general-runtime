import { SlotType } from '@voiceflow/general-types';
import { Entity, VerboseValue } from '@voiceflow/general-types/lib';
import _ from 'lodash';

import { Context, ContextHandler } from '@/types';

import { isIntentRequest } from '../runtime/types';
import { AbstractManager, injectServices } from '../utils';

export const utils = {};

interface Entity {
  name: string;
  value: string;
  rawValue?: string[] | string[][];
}

interface Slot {
  type: {
    value?: string | undefined;
  };
  name: string;
}

interface QueryWord {
  rawText: string;
  canonicalText: string;
  startIndex: number;
  isNatoApco: boolean;
}

const firstLetterExpections = ['00', '000'];
const natoApcoExceptions = new Map([
  ['to', 2],
  ['for', 4],
]);

@injectServices({ utils })
class SlotsService extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  processQuery = (query: string, entityVerboseValue: VerboseValue[]): QueryWord[] => {
    const splitQuery = query.split(' ');
    const processed: QueryWord[] = [];
    let startIndex = 0;

    // Parse QueryWords from string
    for (let i = 0; i < splitQuery.length; ++i) {
      processed.push({
        rawText: splitQuery[i],
        startIndex,
        isNatoApco: false,
        canonicalText: '',
      });
      startIndex += splitQuery[i].length + 1;
    }

    // Determine which QueryWords are NATO/APCO and set canonical text by comparing to entityVerboseValue
    let i = 0;
    for (let j = 0; j < entityVerboseValue.length; ++j) {
      while (processed[i].startIndex !== entityVerboseValue[j].startIndex) {
        ++i;
      }
      processed[i].isNatoApco = true;
      processed[i].canonicalText = entityVerboseValue[j].canonicalText;
    }

    return processed;
  };

  // Combines the NATO/APCO words identified by LUIS together with their first letters.
  // entity.rawValue contains the words to parse and entity.value will store the result.
  // Ex: rawValue: [['November'],['India'],['Charlie'],['Echo']] -> value: 'NICE'.
  // (The only exceptions to taking the first letter of the strings is '00' and '000').
  natoApcoConverter = (entities: Entity[], slots: Slot[]) => {
    entities.forEach((entity) => {
      slots.forEach((slot) => {
        if (entity.name === slot.name && slot.type.value === SlotType.NATOAPCO) {
          // if using regex raw value will not be populated
          if (!Array.isArray(entity.rawValue)) {
            entity.rawValue = entity.value.split(' ').map((value) => [value]);
          }
          entity.value = (entity.rawValue as string[][])
            .reduce((acc, cur) => (natoApcoExceptions.includes(cur[0]) ? acc + cur[0] : acc + cur[0][0]), '')
            .toUpperCase();
        }
      });
    });
  };

  handle = async (context: Context) => {
    if (!isIntentRequest(context.request)) {
      return context;
    }

    const version = await context.data.api.getVersion(context.versionID);
    const slots = version.prototype?.model.slots;

    if (!version) {
      throw new Error('Version not found!');
    }
    if (!slots) {
      return context;
    }

    this.natoApcoConverter(context.request?.payload.entities, slots);
    return context;
  };
}

export default SlotsService;
