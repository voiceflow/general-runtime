import { z } from 'zod';

import { RuntimeCommandDTO } from '@/runtime/lib/Handlers/function/runtime-command/runtime-command.dto';
import { Enum } from '@/runtime/typings/enum';

export const TestFunctionBodyDTO = z.record(z.unknown());
export type TestFunctionBody = z.infer<typeof TestFunctionBodyDTO>;

export const TestFunctionParamsDTO = z.object({
  functionID: z.string(),
});
export type TestFunctionParams = z.infer<typeof TestFunctionParamsDTO>;

export const TestFunctionStatus = {
  Success: 'success',
  Failure: 'failure',
};
export type TestFunctionStatus = Enum<typeof TestFunctionStatus>;

export const TestFunctionResponseDTO = z.object({
  status: z.nativeEnum(TestFunctionStatus),
  latencyMS: z.number(),
  runtimeCommands: RuntimeCommandDTO,
});
export type TestFunctionResponse = z.infer<typeof TestFunctionResponseDTO>;
