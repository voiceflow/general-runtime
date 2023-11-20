import { HTTP_STATUS } from '@voiceflow/verror';
import { z } from 'zod';

import { RuntimeCommandDTO } from '../../runtime-command/runtime-command.dto';

export interface FunctionLambdaRequest {
  code: string;
  variables: Record<string, any>;
  enableLog?: boolean;
}

export const FunctionLambdaErrorDataDTO = z.object({
  errorCode: z.string(),
  reason: z.string(),
  message: z.string().optional(),
});

export type FunctionLambdaErrorData = z.infer<typeof FunctionLambdaErrorDataDTO>;

export const FunctionLambdaSuccessResponseDTO = z.object({
  status: z.literal(HTTP_STATUS.OK),
  body: RuntimeCommandDTO,
});

export type FunctionLambdaSuccessResponse = z.infer<typeof FunctionLambdaSuccessResponseDTO>;

export const FunctionLambdaErrorResponseDTO = z.object({
  status: z.literal(HTTP_STATUS.OK),
  body: RuntimeCommandDTO,
});

export type FunctionLambdaErrorResponse = z.infer<typeof FunctionLambdaErrorResponseDTO>;

export const FunctionLambdaResponseDTO = z.union([FunctionLambdaSuccessResponseDTO, FunctionLambdaErrorResponseDTO]);

export type FunctionLambdaResponse = z.infer<typeof FunctionLambdaResponseDTO>;
