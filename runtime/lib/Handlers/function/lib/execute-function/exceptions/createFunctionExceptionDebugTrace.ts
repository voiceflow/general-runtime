import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { match } from 'ts-pattern';

import { ExecuteFunctionException } from './execute-function.exception';

export function createFunctionExceptionDebugTrace(err: ExecuteFunctionException): BaseTrace.DebugTrace {
  const debugMessage = match(err)
    .when(
      (val) => val instanceof ExecuteFunctionException,
      (err) => err.toCanonicalError()
    )
    .otherwise((err) => `Received an unknown error: ${err.message.slice(0, 300)}`);

  return {
    type: BaseNode.Utils.TraceType.DEBUG,
    payload: {
      message: `[ERROR]: ${debugMessage}`,
    },
  };
}
