import { FunctionVariableType } from '@voiceflow/dtos';
import { z } from 'zod';

import { RuntimeCommandDTO } from '@/runtime/lib/Handlers/function/runtime-command/runtime-command.dto';

export const TestFunctionRequestBodyDTO = z.object({
  functionDefinition: z.object({
    code: z.string(),
    pathCodes: z.array(z.string()),
    inputVars: z.record(
      z.object({
        type: z.nativeEnum(FunctionVariableType).refine((val) => val === FunctionVariableType.STRING, {
          message: `Function input variables currently support 'string' variables only`,
        }),
      })
    ),
    outputVars: z.record(
      z.object({
        type: z.nativeEnum(FunctionVariableType).refine((val) => val === FunctionVariableType.STRING, {
          message: `Function output variables currently support 'string' variables only`,
        }),
      })
    ),
  }),
  inputMapping: z.record(z.string()),
});
export type TestFunctionRequestBody = z.infer<typeof TestFunctionRequestBodyDTO>;

export const TestFunctionResponseDTO = z.object({
  success: z.boolean(),
  latencyMS: z.number(),
  runtimeCommands: RuntimeCommandDTO,
});

export type TestFunctionResponse = z.infer<typeof TestFunctionResponseDTO>;
