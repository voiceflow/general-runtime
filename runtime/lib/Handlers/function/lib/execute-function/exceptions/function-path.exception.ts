import { ExecuteFunctionException } from './execute-function.exception';

export class FunctionPathException extends ExecuteFunctionException {
  constructor(public readonly actualPath: string, public readonly expectedPaths: Array<string>) {
    super();
  }
}

export const isFunctionPathException = (val: unknown): val is FunctionPathException =>
  val instanceof FunctionPathException;
