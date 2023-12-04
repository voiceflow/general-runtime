import { z } from 'zod';

import { ExecuteLambdaException } from './execute-lambda.exception';

export class InvalidRuntimeCommandException extends ExecuteLambdaException {
  constructor(private readonly zodParsingError: z.ZodError) {
    super();
  }

  get message(): string {
    const zodParsingErrors = this.zodParsingError.flatten();

    if (zodParsingErrors.formErrors.length > 0) {
      return zodParsingErrors.formErrors.join('. ');
    }

    return Object.values(this.zodParsingError.flatten().fieldErrors)
      .map((errorArray) => (errorArray ?? []).join('. '))
      .filter((message) => message.length > 0)
      .join('. ');
  }
}
