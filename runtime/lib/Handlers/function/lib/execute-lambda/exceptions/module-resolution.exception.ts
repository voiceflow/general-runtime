import { ExecuteLambdaException } from './execute-lambda.exception';

export class ModuleResolutionException extends ExecuteLambdaException {
  constructor(private readonly errMessage: string) {
    super();
  }

  toCanonicalError(): string {
    return `Function step failed to resolve module: ${this.errMessage}`;
  }
}
