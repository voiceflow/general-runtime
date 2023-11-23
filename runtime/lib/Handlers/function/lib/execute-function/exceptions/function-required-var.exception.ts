import { ExecuteFunctionException } from './execute-function.exception';

export class FunctionRequiredVarException extends ExecuteFunctionException {
  constructor(public readonly varName: string) {
    super();
  }

  toCanonicalError(): string {
    return `Function is missing input value for required variable '${this.varName}'`;
  }
}

export const isFunctionRequiredVarException = (val: unknown): val is FunctionRequiredVarException =>
  val instanceof FunctionRequiredVarException;
