import { z } from 'zod';

import { TraceDTO } from './trace/trace.dto';

export const TraceCommandDTO = z.array(TraceDTO);

export type TraceCommand = z.infer<typeof TraceCommandDTO>;
