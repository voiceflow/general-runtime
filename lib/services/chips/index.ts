import { PrototypeModel } from '@voiceflow/api-sdk';
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

    let model: PrototypeModel | undefined;
    const getModel = async () => {
      if (!model) {
        const { prototype } = await this.services.dataAPI.getVersion(context.versionID);
        model = prototype?.model || { intents: [], slots: [] };
      }
      return model!;
    };

    const trace = await Promise.all(
      context.trace.map(async (frame) => {
        if (frame.type !== TraceType.CHOICE) {
          return frame;
        }
        return {
          ...frame,
          payload: {
            choices: getChoiceChips(frame.payload.choices, await getModel()),
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
