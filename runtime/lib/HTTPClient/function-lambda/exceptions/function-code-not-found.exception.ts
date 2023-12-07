import { LambdaException } from './lambda.exception';

export class FunctionCodeNotFoundException extends LambdaException {
  get message(): string {
    return `Unable to retrieve Function code in lambda`;
  }
}
