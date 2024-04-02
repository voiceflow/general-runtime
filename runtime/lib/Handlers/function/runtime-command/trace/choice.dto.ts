import { z } from 'zod';

import { SimpleGeneralButtonDTO } from '../button/general-button.dto';
import { UnknownTraceDTO } from './base.dto';
import { SimpleTraceType } from './simple-trace-type.enum';

export const SimpleChoiceTraceDTO = UnknownTraceDTO.extend({
  type: z.literal(SimpleTraceType.Choice),
  payload: z.object({
    buttons: z.array(SimpleGeneralButtonDTO),
  }),
}).passthrough();

export type SimpleChoiceTrace = z.infer<typeof SimpleChoiceTraceDTO>;
