import { z } from 'zod';

import { RuntimeCommandDTO } from '../../Handlers/function/runtime-command/runtime-command.dto';
import { LambdaErrorCode } from './lambda-error-code.enum';

interface BaseFunctionLambdaRequest {
  requestId: string;
  variables: Record<string, unknown>;
  enableLog?: boolean;
}

interface FunctionLambdaRequestWithReference extends BaseFunctionLambdaRequest {
  codeId: string;
}

interface FunctionLambdaRequestWithCode extends BaseFunctionLambdaRequest {
  code: string;
}

export type FunctionLambdaRequest =
  | FunctionLambdaRequestWithReference
  | FunctionLambdaRequestWithCode;

export const FunctionLambdaSuccessResponseDTO = RuntimeCommandDTO;

export type FunctionLambdaSuccessResponse = z.infer<typeof FunctionLambdaSuccessResponseDTO>;

export const FunctionLambdaErrorResponseDTO = z.object({
  errorCode: z.nativeEnum(LambdaErrorCode),
  message: z.string(),
});

export type FunctionLambdaErrorResponse = z.infer<typeof FunctionLambdaErrorResponseDTO>;

export const FunctionLambdaResponseDTO = z.union([
  FunctionLambdaSuccessResponseDTO,
  FunctionLambdaErrorResponseDTO,
]);

export type FunctionLambdaResponse = z.infer<typeof FunctionLambdaResponseDTO>;
