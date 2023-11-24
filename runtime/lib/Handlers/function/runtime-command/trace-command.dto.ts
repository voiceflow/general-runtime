import { z } from 'zod';

export const TraceDTO = z.object({
  type: z.string({
    required_error: `A Voiceflow trace must define a 'type' property`,
  }),
});

export type Trace = z.infer<typeof TraceDTO>;

export const TraceCommandDTO = z.array(TraceDTO, {
  invalid_type_error: 'A trace command must be a list of valid Voiceflow trace types',
});

export type TraceCommand = z.infer<typeof TraceCommandDTO>;
