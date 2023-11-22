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

  toCanonicalError(): string {
    const [verbedToken, nounToken, kindToken] =
      this.kind === FunctionVariableKind.INPUT ? ['received', 'argument', 'input'] : ['produced', 'value', 'output'];
    return `Function step ${verbedToken} an invalid ${nounToken} with type '${this.actualType}' for ${kindToken} variable '${this.varName}' with expected type '${this.expectedType}'`;
  }
}

export const isFunctionTypeException = (val: unknown): val is FunctionTypeException =>
  val instanceof FunctionTypeException;
