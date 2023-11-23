import { z } from 'zod';

import { TraceDTO } from './trace/trace.dto';

export const TraceCommandDTO = z.array(TraceDTO, {
  invalid_type_error: 'A trace command must be a list of valid Voiceflow trace types',
});

export type TraceCommand = z.infer<typeof TraceCommandDTO>;
