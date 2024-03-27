import { z } from 'zod';

import { TraceDTO } from './base.dto';
import { SimpleTraceType } from './simple-trace-type.enum';

export const SimpleTextTraceDTO = TraceDTO.extend({
  type: z.literal(SimpleTraceType.Text),
  payload: z.object({
    message: z.string(),
  }),
}).passthrough();

export type SimpleTextTrace = z.infer<typeof SimpleTextTraceDTO>;
