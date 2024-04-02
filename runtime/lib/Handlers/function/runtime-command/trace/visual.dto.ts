import { z } from 'zod';

import { UnknownTraceDTO } from './base.dto';
import { SimpleTraceType } from './simple-trace-type.enum';

export const SimpleVisualTraceDTO = UnknownTraceDTO.extend({
  type: z.literal(SimpleTraceType.Visual),
  payload: z.object({
    image: z.string(),
  }),
}).passthrough();

export type SimpleVisualTrace = z.infer<typeof SimpleVisualTraceDTO>;
