import { FunctionException } from '../../function-exception/function.exception';

export class ExecuteLambdaException extends FunctionException {
  toCanonicalError(): string {
    return `An error occurred while executing the Function code: ${this.message}`;
  }
}
