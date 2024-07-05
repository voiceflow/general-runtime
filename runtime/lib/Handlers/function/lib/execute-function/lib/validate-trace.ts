import { InvalidRuntimeCommandException } from '@/runtime/lib/HTTPClient/function-lambda/exceptions/invalid-runtime-command.exception';

import { UnknownTrace } from '../../../runtime-command/trace/base.dto';
import { SimpleTraceDTO } from '../../../runtime-command/trace-command.dto';
import { isSimpleTraceType } from './is-simple-trace';

export function parseTrace(trace: UnknownTrace): UnknownTrace {
  // force all function declared traces to have a timestamp
  // eslint-disable-next-line no-param-reassign
  if (!trace.time) trace.time = Date.now();

  if (isSimpleTraceType(trace.type)) {
    try {
      return SimpleTraceDTO.parse(trace);
    } catch (err) {
      throw new InvalidRuntimeCommandException(err);
    }
  }
  return trace;
}
