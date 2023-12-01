import { BaseNode } from '@voiceflow/base-types';
import { HTTPException } from '@voiceflow/exception';
import { match } from 'ts-pattern';

import { Trace } from '../../runtime-command/trace-command.dto';

export abstract class FunctionException extends Error {
  abstract toCanonicalError(): string;
}

export function createFunctionExceptionDebugTrace(err: unknown): Trace {
  const debugMessage = match(err)
    .when(
      (val): val is FunctionException => val instanceof FunctionException,
      (err) => err.toCanonicalError()
    )
    .when(
      (val): val is HTTPException => HTTPException.instanceOf(val),
      (err) => `${err.statusCode} - ${err.statusText} - ${err.message}`
    )
    .otherwise((err) => `Received an unknown error: payload=${JSON.stringify(err).slice(0, 300)}`);

  return {
    type: BaseNode.Utils.TraceType.DEBUG,
    payload: {
      message: `[ERROR]: Encountered an error in a Function step. ${debugMessage}`,
    },
  };
}
