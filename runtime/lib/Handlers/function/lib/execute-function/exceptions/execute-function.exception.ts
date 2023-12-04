import { FunctionException } from '../../function-exception/function.exception';

export class ExecuteFunctionException extends FunctionException {
  get message(): string {
    return `An error occurred while processing the Function step: ${this.message}`;
  }
}
