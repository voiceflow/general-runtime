import { z } from 'zod';

import { TraceDTO } from './base.dto';
import { SimpleTraceType } from './simple-trace-type.enum';

export const SimpleVisualTraceDTO = TraceDTO.extend({
  type: z.literal(SimpleTraceType.Visual),
  payload: z.object({
    image: z.string(),
  }),
}).passthrough();

export type SimpleVisualTrace = z.infer<typeof SimpleVisualTraceDTO>;
