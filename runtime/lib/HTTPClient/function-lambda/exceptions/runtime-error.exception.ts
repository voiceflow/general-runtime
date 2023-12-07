import { LambdaException } from './lambda.exception';

export class RuntimeErrorException extends LambdaException {
  get message(): string {
    return `Function step produced an uncaught exception: ${this.message}`;
  }
}
