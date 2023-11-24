import { InternalServerErrorException } from '@voiceflow/exception';
import axios from 'axios';
import { z } from 'zod';

import Config from '@/config';

import { RuntimeCommand } from '../../runtime-command/runtime-command.dto';
import { ExecuteLambdaException } from './exceptions/execute-lambda.exception';
import { InvalidRuntimeCommandException } from './exceptions/invalid-runtime-command.exception';
import { ModuleResolutionException } from './exceptions/module-resolution.exception';
import { RuntimeErrorException } from './exceptions/runtime-error.exception';
import {
  FunctionLambdaErrorResponseDTO,
  FunctionLambdaRequest,
  FunctionLambdaResponse,
  FunctionLambdaSuccessResponseDTO,
} from './execute-lambda.types';
import { LambdaErrorCode } from './lambda-error-code.enum';

export async function executeLambda(
  code: string,
  variables: Record<string, any>,
  enableLog = false
): Promise<RuntimeCommand> {
  const functionLambdaEndpoint = Config.FUNCTION_LAMBDA_ENDPOINT;
  const request: FunctionLambdaRequest = {
    code,
    variables,
    enableLog,
  };

  return axios
    .post<FunctionLambdaResponse>(functionLambdaEndpoint, request)
    .then(({ data }) => {
      try {
        return FunctionLambdaSuccessResponseDTO.parse(data);
      } catch (err) {
        if (err instanceof z.ZodError) {
          throw new InvalidRuntimeCommandException(err);
        }
        throw err;
      }
    })
    .catch((err) => {
      const errorResponse = FunctionLambdaErrorResponseDTO.safeParse(err?.response?.data);
      if (errorResponse.success) {
        const { errorCode, message } = errorResponse.data;

        switch (errorCode) {
          case LambdaErrorCode.SandboxRuntimeError:
            throw new RuntimeErrorException(message);
          case LambdaErrorCode.SandboxModuleResolution:
            throw new ModuleResolutionException(message);
          default:
            throw new ExecuteLambdaException(message);
        }
      }

      throw new InternalServerErrorException({
        message: 'Unknown error occurred when executing the function',
        cause: JSON.stringify(err).slice(0, 100),
      });
    });
}
