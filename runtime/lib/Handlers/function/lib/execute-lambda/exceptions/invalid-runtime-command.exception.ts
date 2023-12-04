import { z } from 'zod';

import { formatZodError } from '@/utils/zod-error/formatZodError';

import { ExecuteLambdaException } from './execute-lambda.exception';

export class InvalidRuntimeCommandException extends ExecuteLambdaException {
  constructor(private readonly zodParsingError: z.ZodError) {
    super();
  }

  get message(): string {
    return formatZodError(this.zodParsingError);
  }
}
