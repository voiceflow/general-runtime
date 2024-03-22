import { VariableDatatype } from '@voiceflow/dtos';
import { z } from 'zod';

import { RuntimeCommandDTO } from '@/runtime/lib/Handlers/function/runtime-command/runtime-command.dto';

export const TestFunctionRequestBodyDTO = z
  .object({
    definition: z
      .object({
        code: z.string(),
        pathCodes: z.array(z.string()),
        inputVars: z.record(
          z
            .object({
              type: z.literal(VariableDatatype.TEXT),
            })
            .strict()
        ),
        outputVars: z.record(
          z
            .object({
              type: z.literal(VariableDatatype.TEXT),
            })
            .strict()
        ),
      })
      .strict(),
    invocation: z.object({
      inputVars: z.record(z.string()),
    }),
  })
  .strict();

export type TestFunctionRequestBody = z.infer<typeof TestFunctionRequestBodyDTO>;

export const TestFunctionResponseDTO = z
  .object({
    success: z.boolean(),
    latencyMS: z.number(),
    runtimeCommands: RuntimeCommandDTO,
  })
  .strict();

export type TestFunctionResponse = z.infer<typeof TestFunctionResponseDTO>;
