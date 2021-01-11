import { TraceType } from '@voiceflow/general-types';
import _ from 'lodash';

import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';
import { getChoiceChips } from './utils';

export const utils = {
  getChoiceChips,
};

@injectServices({ utils })
class Chips extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  handle = async (context: Context) => {
    if (!context.trace) context.trace = [];

    const model = (await context.data.api.getVersion(context.versionID))?.prototype?.model || { intents: [], slots: [] };

    const trace = await Promise.all(
      context.trace.map(async (frame) => {
        if (frame.type !== TraceType.CHOICE) {
          return frame;
        }
        return {
          ...frame,
          payload: {
            choices: getChoiceChips(frame.payload.choices, model),
          },
        };
      })
    );

    return {
      ...context,
      trace,
    };
  };
}

export default Chips;
