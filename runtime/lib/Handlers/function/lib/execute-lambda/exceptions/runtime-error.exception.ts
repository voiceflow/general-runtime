import { ExecuteLambdaException } from './execute-lambda.exception';

export class RuntimeErrorException extends ExecuteLambdaException {
  constructor(private readonly stackTrace: string) {
    super();
  }

  toCanonicalError(): string {
    return `Function step produced an uncaught exception: ${this.stackTrace}`;
  }
}
