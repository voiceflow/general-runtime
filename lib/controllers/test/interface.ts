import { FunctionVariableType } from '@voiceflow/dtos';
import { z } from 'zod';

import { RuntimeCommandDTO } from '@/runtime/lib/Handlers/function/runtime-command/runtime-command.dto';

export const TestFunctionBodyDTO = z.object({
  functionDefn: z.object({
    code: z.string(),
    paths: z.array(
      z.object({
        name: z.string(),
      })
    ),
    inputVars: z.record(
      z.object({
        type: z.literal(FunctionVariableType.STRING),
      })
    ),
    outputVars: z.record(
      z.object({
        type: z.literal(FunctionVariableType.STRING),
      })
    ),
  }),
  inputMapping: z.record(z.string()),
});
export type TestFunctionBody = z.infer<typeof TestFunctionBodyDTO>;

export const TestFunctionSuccessResponseDTO = z.object({
  success: z.literal(true),
  latencyMS: z.number(),
  runtimeCommands: RuntimeCommandDTO,
});

export const TestFunctionFailureResponseDTO = z.object({
  success: z.literal(false),
  errorMessage: z.string(),
});

export const TestFunctionResponseDTO = z.discriminatedUnion('success', [
  TestFunctionSuccessResponseDTO,
  TestFunctionFailureResponseDTO,
]);

export type TestFunctionResponse = z.infer<typeof TestFunctionResponseDTO>;
