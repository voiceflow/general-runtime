import { ExecuteFunctionException } from './execute-function.exception';

export class FunctionStageException extends ExecuteFunctionException {
  constructor(public readonly actualStage: string, public readonly expectedStages: Array<string>) {
    super();
  }
}

export const isFunctionStageException = (val: unknown): val is FunctionStageException =>
  val instanceof FunctionStageException;
