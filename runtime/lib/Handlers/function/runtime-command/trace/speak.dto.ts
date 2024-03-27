import { z } from 'zod';

import { TraceDTO } from './base.dto';
import { SimpleTraceType } from './simple-trace-type.enum';

export const SimpleSpeakTraceDTO = TraceDTO.extend({
  type: z.literal(SimpleTraceType.Speak),
  payload: z.object({
    message: z.string(),
    voice: z.string().optional(),
    src: z.string().optional(),
  }),
}).passthrough();

export type SimpleSpeakTrace = z.infer<typeof SimpleSpeakTraceDTO>;
