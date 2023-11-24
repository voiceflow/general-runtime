import { FunctionException } from '../../function-exception/function.exception';

export abstract class ExecuteFunctionException extends FunctionException {
  toCanonicalError(): string {
    return `An error occurred while processing the Function step: ${this.message}`;
  }
}
