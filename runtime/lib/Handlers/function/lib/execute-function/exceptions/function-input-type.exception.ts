import { ExecuteFunctionException } from './execute-function.exception';

export class FunctionInputTypeException extends ExecuteFunctionException {
  constructor(
    public readonly varName: string,
    public readonly expectedType: string,
    public readonly actualType: string
  ) {
    super();
  }

  toCanonicalError(): string {
    return `Function step received an invalid value with type '${this.actualType}' for input variable '${this.varName}' with expected type '${this.expectedType}'`;
  }
}
