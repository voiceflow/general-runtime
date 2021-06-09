/**
 * [[include:buttons.md]]
 * @packageDocumentation
 */

import { TraceType } from '@voiceflow/general-types';

import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';
import { getChoiceButtons } from './utils';

export const utils = {
  getChoiceButtons,
};

@injectServices({ utils })
class Buttons extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
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
            buttons: this.services.utils.getChoiceButtons(frame.payload.buttons, model),
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

export default Buttons;
