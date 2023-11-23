import { InternalServerErrorException } from '@voiceflow/exception';
import axios from 'axios';
import { z } from 'zod';

import Config from '@/config';

import { RuntimeCommand } from '../../runtime-command/runtime-command.dto';
import { InvalidRuntimeCommandException } from './exceptions/invalid-runtime-command.exception';
import {
  FunctionLambdaErrorResponseDTO,
  FunctionLambdaRequest,
  FunctionLambdaResponse,
  FunctionLambdaSuccessResponseDTO,
} from './execute-lambda.types';

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
    .then(({ data }) => FunctionLambdaSuccessResponseDTO.parse(data))
    .catch((err) => {
      if (err instanceof z.ZodError) {
        throw new InvalidRuntimeCommandException(err);
      }

      const errorResponse = FunctionLambdaErrorResponseDTO.safeParse(err?.response?.data);
      if (errorResponse.success) {
        const { reason, message } = errorResponse.data;
        throw new InternalServerErrorException({
          message,
          cause: reason,
        });
      }

      throw new InternalServerErrorException({
        message: 'Unknown error occurred when executing the function',
        cause: JSON.stringify(err).slice(0, 100),
      });
    });
}
