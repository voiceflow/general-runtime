import { ExecuteLambdaException } from './execute-lambda.exception';

export class RuntimeErrorException extends ExecuteLambdaException {
  toCanonicalError(): string {
    return `Function step produced an uncaught exception: ${this.message}`;
  }
}
