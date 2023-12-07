import { z } from 'zod';

import { formatZodError } from '@/utils/zod-error/formatZodError';

import { LambdaException } from './lambda.exception';

export class InvalidRuntimeCommandException extends LambdaException {
  constructor(private readonly zodParsingError: z.ZodError) {
    super();
  }

  get message(): string {
    return formatZodError(this.zodParsingError);
  }
}
