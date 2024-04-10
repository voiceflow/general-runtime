import { VariableDatatype } from '@voiceflow/dtos';

import { ExecuteFunctionException } from './execute-function.exception';

export class FunctionInputTypeException extends ExecuteFunctionException {
  constructor(
    public readonly varName: string,
    public readonly expectedType: VariableDatatype,
    public readonly actualValue: unknown
  ) {
    super();
  }

  get message(): string {
    return `Function step received an invalid value with type '${typeof this
      .actualValue}' for input variable '${this.varName}' with expected type '${
      this.expectedType
    }'`;
  }
}
