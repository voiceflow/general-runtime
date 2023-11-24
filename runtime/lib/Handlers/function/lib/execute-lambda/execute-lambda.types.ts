import { z } from 'zod';

import { RuntimeCommandDTO } from '../../runtime-command/runtime-command.dto';
import { LambdaErrorCode } from './lambda-error-code.enum';

export interface FunctionLambdaRequest {
  code: string;
  variables: Record<string, any>;
  enableLog?: boolean;
}

export const FunctionLambdaSuccessResponseDTO = RuntimeCommandDTO;

export type FunctionLambdaSuccessResponse = z.infer<typeof FunctionLambdaSuccessResponseDTO>;

export const FunctionLambdaErrorResponseDTO = z.object({
  errorCode: z.nativeEnum(LambdaErrorCode),
  message: z.string(),
});

export type FunctionLambdaErrorResponse = z.infer<typeof FunctionLambdaErrorResponseDTO>;

export const FunctionLambdaResponseDTO = z.union([FunctionLambdaSuccessResponseDTO, FunctionLambdaErrorResponseDTO]);

export type FunctionLambdaResponse = z.infer<typeof FunctionLambdaResponseDTO>;
