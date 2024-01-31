import { z } from 'zod';

import { FunctionLambdaResponseDTO } from './function-lambda-client.interface';

export const AWSSuccessResponsePayloadDTO = z.object({
  statusCode: z.number(),
  body: FunctionLambdaResponseDTO,
});

export type AWSSuccessResponsePayload = z.infer<typeof AWSSuccessResponsePayloadDTO>;
