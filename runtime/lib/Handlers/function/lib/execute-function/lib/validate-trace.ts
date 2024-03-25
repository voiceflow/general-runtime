import { InvalidRuntimeCommandException } from '@/runtime/lib/HTTPClient/function-lambda/exceptions/invalid-runtime-command.exception';

import { SimpleTraceDTO, Trace } from '../../../runtime-command/trace-command.dto';
import { isSimpleTraceType } from './is-simple-trace';

export function validateTrace(trace: Trace): Trace {
  if (isSimpleTraceType(trace.type)) {
    try {
      return SimpleTraceDTO.parse(trace);
    } catch (err) {
      throw new InvalidRuntimeCommandException(err);
    }
  }
  return trace;
}
