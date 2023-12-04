import { z } from 'zod';

import { ExecuteLambdaException } from './execute-lambda.exception';

export class InvalidRuntimeCommandException extends ExecuteLambdaException {
  constructor(private readonly zodParsingError: z.ZodError) {
    super();
  }

  get message(): string {
    const errors = this.zodParsingError.flatten();

    if (errors.formErrors.length > 0) {
      return errors.formErrors.join('. ');
    }

    return Object.entries(errors.fieldErrors)
      .map((errorArray) => (errorArray ?? []).join('. '))
      .filter((message) => message.length > 0)
      .join('. ');
  }
}
