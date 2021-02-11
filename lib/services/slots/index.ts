/**
 * [[include:chips.md]]
 * @packageDocumentation
 */

// import { TraceType } from '@voiceflow/general-types';
import _ from 'lodash';

import { Context, ContextHandler } from '@/types';

import { isIntentRequest } from '../runtime/types';
import { AbstractManager, injectServices } from '../utils';

export const utils = {};

interface Entity {
  name: string;
  value: string;
  rawValue?: string | string[][];
}

interface Slot {
  type: {
    value?: string | undefined;
  };
  name: string;
}

@injectServices({ utils })
class SlotsService extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  // Combines the NATO/APCO words identified by LUIS together with their first letters.
  // entity.rawValue contains the words to parse and entity.value will store the result.
  // Ex: rawValue: [['November'],['India'],['Charlie'],['Echo']] -> value: 'NICE'.
  // (The only exceptions to taking the first letter of the strings is '00' and '000').
  natoApcoConverter = (entities: Entity[], slots: Slot[]) => {
    entities.forEach((entity) => {
      slots.forEach((slot) => {
        if (entity.name === slot.name && slot.type.value === 'VF.NATOAPCO') {
          if (Array.isArray(entity.rawValue)) {
            entity.value = entity.rawValue.reduce((acc, cur) => (cur[0] === '00' || cur[0] === '000' ? acc + cur[0] : acc + cur[0][0]), '');
          }
        }
      });
    });
  };

  handle = async (context: Context) => {
    if (!isIntentRequest(context.request)) {
      return context;
    }

    const version = await context.data.api.getVersion(context.versionID);

    if (!version) {
      throw new Error('Version not found!');
    }

    this.natoApcoConverter(context.request?.payload.entities, version.platformData.slots);

    return context;
  };
}

export default SlotsService;
