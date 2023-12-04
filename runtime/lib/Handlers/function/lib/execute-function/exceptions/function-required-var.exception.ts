import { ExecuteFunctionException } from './execute-function.exception';

export class FunctionRequiredVarException extends ExecuteFunctionException {
  constructor(public readonly varName: string) {
    super();
  }

  get message(): string {
    return `Function is missing input value for required variable '${this.varName}'`;
  }
}
