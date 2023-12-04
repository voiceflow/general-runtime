import { ExecuteLambdaException } from './execute-lambda.exception';

export class RuntimeErrorException extends ExecuteLambdaException {
  get message(): string {
    return `Function step produced an uncaught exception: ${this.message}`;
  }
}
