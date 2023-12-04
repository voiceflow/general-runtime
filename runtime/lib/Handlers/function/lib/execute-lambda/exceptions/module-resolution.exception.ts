import { ExecuteLambdaException } from './execute-lambda.exception';

export class ModuleResolutionException extends ExecuteLambdaException {
  get message(): string {
    return `Function step failed to resolve module: ${this.message}`;
  }
}
