import { z } from 'zod';

import { SimpleCardDTO } from '../card/card.dto';
import { UnknownTraceDTO } from './base.dto';
import { SimpleTraceType } from './simple-trace-type.enum';

export const SimpleCardV2TraceDTO = UnknownTraceDTO.extend({
  type: z.literal(SimpleTraceType.CardV2),
  payload: SimpleCardDTO,
}).passthrough();

export type SimpleCardV2Trace = z.infer<typeof SimpleCardV2TraceDTO>;
