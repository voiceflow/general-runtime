import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

import { ExecuteLambdaException } from './execute-lambda.exception';

export class InvalidRuntimeCommandException extends ExecuteLambdaException {
  constructor(private readonly zodParsingError: z.ZodError) {
    super();
  }

  toCanonicalError(): string {
    return fromZodError(this.zodParsingError).message;
  }
}
