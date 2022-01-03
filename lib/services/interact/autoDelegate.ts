import { Trace } from '@voiceflow/base-types';
import { Utils } from '@voiceflow/common';

import { PartialContext, TurnBuilder } from '@/runtime';
import { Context } from '@/types';

export const MAX_DELEGATION_TURNS = 3;

const isGoToTrace = (frame: Trace.AnyTrace | null): frame is Trace.GoToTrace => frame?.type === Trace.TraceType.GOTO && !!frame.payload.request;

const autoDelegateTurn = async (turn: TurnBuilder<Context>, initContext: PartialContext<Context>): Promise<Context> => {
  let context: Context | null = null;
  const trace: Trace.AnyTrace[] = [];

  for (let i = 0; i < MAX_DELEGATION_TURNS; i++) {
    // eslint-disable-next-line no-await-in-loop
    context = await turn.handle(context || initContext);
    if (!context.trace) break;

    const [filteredTrace, goToTrace] = Utils.array.filterAndGetLastRemovedValue(context.trace, (frame) => !isGoToTrace(frame));
    trace.push(...filteredTrace);

    if (isGoToTrace(goToTrace)) {
      context.request = goToTrace.payload.request;
    } else {
      break;
    }
  }

  return { ...context!, trace };
};

export default autoDelegateTurn;
