import { z } from 'zod';

export const OutputVarsCommandDTO = z.record(z.any());

export type OutputVarsCommand = z.infer<typeof OutputVarsCommandDTO>;
