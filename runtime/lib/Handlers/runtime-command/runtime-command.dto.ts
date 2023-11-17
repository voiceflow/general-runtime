import { z } from 'zod';

import { NextCommandDTO } from './next-command/next-command.dto';
import { OutputVarsCommandDTO } from './output-vars-command/output-vars-command.dto';
import { TraceCommandDTO } from './trace-command/trace-command.dto';

export const RuntimeCommandDTO = z
  .object({
    outputVars: OutputVarsCommandDTO,
    next: NextCommandDTO,
    trace: TraceCommandDTO,
  })
  .partial()
  .strict();

export type RuntimeCommand = z.infer<typeof RuntimeCommandDTO>;
