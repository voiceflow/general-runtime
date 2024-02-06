import { z } from 'zod';

export const AWSSuccessResponsePayloadDTO = z.object({
  statusCode: z.number(),
  body: z.unknown(),
});

export type AWSSuccessResponsePayload = z.infer<typeof AWSSuccessResponsePayloadDTO>;
