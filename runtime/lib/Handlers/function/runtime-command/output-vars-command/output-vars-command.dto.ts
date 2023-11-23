import { z } from 'zod';

export const PlainDataDTO = z.union([z.number(), z.string(), z.boolean()]);

export type PlainData = z.infer<typeof PlainDataDTO>;

export const OutputVarsCommandDTO = z.record(PlainDataDTO, {
  invalid_type_error: `A output (variables) command must be a record of valid output variable names to plain data values ('number', 'boolean', 'string')`,
});

export type OutputVarsCommand = z.infer<typeof OutputVarsCommandDTO>;
