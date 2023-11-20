import { FunctionVariableKind } from '@voiceflow/dtos';

import { ExecuteFunctionException } from './execute-function.exception';

export class FunctionTypeException extends ExecuteFunctionException {
  constructor(
    public readonly varName: string,
    public readonly expectedType: string,
    public readonly actualType: string,
    public readonly kind: FunctionVariableKind
  ) {
    super();
  }
}

export const isFunctionTypeException = (val: unknown): val is FunctionTypeException =>
  val instanceof FunctionTypeException;
