import { ExecuteFunctionException } from './execute-function.exception';

export class FunctionPathException extends ExecuteFunctionException {
  constructor(public readonly actualPath: string, public readonly expectedPaths: Array<string>) {
    super();
  }

  get message(): string {
    return `Function step returned an invalid path '${
      this.actualPath
    }' which is not one of the expected paths '${JSON.stringify(this.expectedPaths)}`;
  }
}
