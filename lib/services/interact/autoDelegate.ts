import { Trace } from '@voiceflow/base-types';

import { PartialContext } from '@/runtime';
import { Context } from '@/types';

export const MAX_DELEGATION_TURNS = 3;

// mostly just saves us needing to traverse an array twice
const filterAndGetLastRemovedValue = <A>(list: A[], filterFunc: (a: A) => boolean): [A[], A | null] => {
  let lastItem: A | null = null;
  const filteredList = list.filter((a) => {
    if (filterFunc(a)) return true;
    lastItem = a;
    return false;
  });
  return [filteredList, lastItem];
};

const isGoToTrace = (frame?: Trace.AnyTrace | null): frame is Trace.GoToTrace => frame?.type === Trace.TraceType.GOTO && !!frame.payload.request;

const autoDelegateTurn = async (
  handler: (_request: PartialContext<Context>) => Promise<Context>,
  initContext: PartialContext<Context>
): Promise<Context> => {
  let iterations = 0;
  let context: Context | null = null;
  const trace: Trace.AnyTrace[] = [];

  do {
    // eslint-disable-next-line no-await-in-loop
    context = await handler(context || initContext);
    if (!context.trace) break;

    const [filteredTrace, goToTrace] = filterAndGetLastRemovedValue(context.trace, (frame) => !isGoToTrace(frame));
    trace.push(...filteredTrace);

    if (isGoToTrace(goToTrace)) {
      context.request = goToTrace.payload.request;
    } else {
      break;
    }

    iterations++;
  } while (iterations < MAX_DELEGATION_TURNS);

  return { ...context, trace };
};

export default autoDelegateTurn;
