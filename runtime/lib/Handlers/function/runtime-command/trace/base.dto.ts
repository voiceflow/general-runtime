import { z } from 'zod';

export const UnknownTraceDTO = z
  .object({
    type: z.string({
      required_error: `A Voiceflow trace must define a 'type' property`,
      invalid_type_error: `Property 'type' of a Voiceflow trace must be a string`,
    }),
    payload: z.unknown().optional(),
  })
  .passthrough();

export type UnknownTrace = z.infer<typeof UnknownTraceDTO>;
