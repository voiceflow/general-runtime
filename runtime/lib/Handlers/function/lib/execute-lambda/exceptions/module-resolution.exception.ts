import { LambdaException } from './lambda.exception';

export class ModuleResolutionException extends LambdaException {
  get message(): string {
    return `Function step failed to resolve module: ${this.message}`;
  }
}
