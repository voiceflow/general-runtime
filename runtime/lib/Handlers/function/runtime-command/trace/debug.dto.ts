import { z } from 'zod';

import { TraceDTO } from './base.dto';
import { SimpleTraceType } from './simple-trace-type.enum';

export const SimpleDebugTraceDTO = TraceDTO.extend({
  type: z.literal(SimpleTraceType.Debug),
  payload: z.object({
    message: z.string(),
  }),
}).passthrough();

export type SimpleDebugTrace = z.infer<typeof SimpleDebugTraceDTO>;
