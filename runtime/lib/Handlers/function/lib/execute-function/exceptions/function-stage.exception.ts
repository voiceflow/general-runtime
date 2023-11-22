import { ExecuteFunctionException } from './execute-function.exception';

export class FunctionStageException extends ExecuteFunctionException {
  constructor(public readonly actualStage: string, public readonly expectedStages: Array<string>) {
    super();
  }

  toCanonicalError(): string {
    return `Function step jumped to an invalid stage '${
      this.actualStage
    }' which is not one of the expected stages '${JSON.stringify(this.expectedStages)}`;
  }
}

export const isFunctionStageException = (val: unknown): val is FunctionStageException =>
  val instanceof FunctionStageException;
