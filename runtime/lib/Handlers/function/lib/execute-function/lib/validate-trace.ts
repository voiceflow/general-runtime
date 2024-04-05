import { InvalidRuntimeCommandException } from '@/runtime/lib/HTTPClient/function-lambda/exceptions/invalid-runtime-command.exception';

import { UnknownTrace } from '../../../runtime-command/trace/base.dto';
import { SimpleTraceDTO } from '../../../runtime-command/trace-command.dto';
import { isSimpleTraceType } from './is-simple-trace';

export function parseTrace(trace: UnknownTrace): UnknownTrace {
  if (isSimpleTraceType(trace.type)) {
    try {
      return SimpleTraceDTO.parse(trace);
    } catch (err) {
      throw new InvalidRuntimeCommandException(err);
    }
  }
  return trace;
}
