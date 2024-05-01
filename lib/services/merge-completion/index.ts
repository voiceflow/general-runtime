/* eslint-disable sonarjs/cognitive-complexity */
import { BaseTrace } from '@voiceflow/base-types';
import {
  isCompletionContinueTrace,
  isCompletionEndTrace,
  isCompletionStartTrace,
  isCompletionStartTraceSpeak,
  isCompletionStartTraceText,
} from '@voiceflow/base-types/build/cjs/trace/completion';

import { Store } from '@/runtime';
import { Context, ContextHandler } from '@/types';

import { generateOutput } from '../runtime/handlers/utils/output';
import { getOutputTrace } from '../runtime/utils';
import { AbstractManager, injectServices } from '../utils';

const utils = {};

@injectServices({ utils })
export default class MergeCompletion extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  handle(context: Context) {
    if (!context.trace) return context;

    const trace = context.trace.reduce<BaseTrace.AnyTrace[]>((acc, trace) => {
      if (acc.length === 0) {
        acc.push(trace);
        return acc;
      }

      if (isCompletionContinueTrace(trace)) {
        const lastTrace = acc[acc.length - 1];
        if (!isCompletionStartTrace(lastTrace)) {
          // corrupted traces, should never happen
          return acc;
        }

        lastTrace.payload.completion += trace.payload.completion;
      } else if (isCompletionEndTrace(trace)) {
        const lastTrace = acc[acc.length - 1];
        if (!isCompletionStartTrace(lastTrace)) {
          // corrupted traces, should never happen
          return acc;
        }

        const voice = isCompletionStartTraceSpeak(lastTrace) ? lastTrace.payload.voice : undefined;
        const output = generateOutput(lastTrace.payload.completion, context.project, voice);

        // Override completion trace to real trace
        acc[acc.length - 1] = getOutputTrace({
          output,
          ai: true,
          variables: new Store(context.state.variables),
          version: context.version,
          delay: isCompletionStartTraceText(lastTrace) ? lastTrace.payload.delay : undefined,
        });
      } else {
        acc.push(trace);
      }

      return acc;
    }, []);

    return {
      ...context,
      trace,
    };
  }
}
