import { z } from 'zod';

import { TraceDTO } from './base.dto';
import { SimpleTraceType } from './simple-trace-type.enum';

export const SimpleAudioTraceDTO = TraceDTO.extend({
  type: z.literal(SimpleTraceType.Audio),
  payload: z.object({
    src: z.string().optional(),
  }),
}).passthrough();

export type SimpleAudioTrace = z.infer<typeof SimpleAudioTraceDTO>;
