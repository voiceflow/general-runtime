import { TraceType } from '@voiceflow/general-types';
import { TraceFrame as SpeakTrace } from '@voiceflow/general-types/build/nodes/speak';
import _ from 'lodash';

import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';

export const utils = {};

@injectServices({ utils })
class Chips extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  handle = async (context: Context) => {
    if (!context.trace) context.trace = [];

    const trace = await Promise.all(
      context.trace.map(async (frame) => {
        return frame;
      })
    );

    return {
      ...context,
      trace,
    };
  };
}

export default Chips;
