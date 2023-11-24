import { BaseTrace } from '@voiceflow/base-types';
import { z } from 'zod';

export const TraceDTO = z.object({
  type: z.nativeEnum(BaseTrace.TraceType),
});

export type Trace = z.infer<typeof TraceDTO>;

export const TraceCommandDTO = z.array(TraceDTO, {
  invalid_type_error: 'A trace command must be a list of valid Voiceflow trace types',
});

export type TraceCommand = z.infer<typeof TraceCommandDTO>;
