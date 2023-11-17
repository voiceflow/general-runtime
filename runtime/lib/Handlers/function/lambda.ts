import { InternalServerErrorException } from '@voiceflow/exception';
import axios from 'axios';

import Config from '@/config';

import { RuntimeCommand } from '../runtime-command/runtime-command.dto';
import {
  FunctionLambdaErrorDataDTO,
  FunctionLambdaRequest,
  FunctionLambdaResponse,
  FunctionLambdaSuccessResponseDTO,
} from './lambda.types';

export async function executeLambda(
  code: string,
  variables: Record<string, any>,
  enableLog = false
): Promise<RuntimeCommand> {
  const request: FunctionLambdaRequest = {
    code,
    variables,
    enableLog,
  };

  const functionLambdaEndpoint = Config.FUNCTION_LAMBDA_ENDPOINT;
  const { data } = await axios.post<FunctionLambdaResponse>(functionLambdaEndpoint, request);

  const runtimeCommand = FunctionLambdaSuccessResponseDTO.safeParse(data);
  if (runtimeCommand.success) {
    return runtimeCommand.data.body;
  }

  const errorResponse = FunctionLambdaErrorDataDTO.safeParse(data);
  if (errorResponse.success) {
    const { errorCode, reason, message } = errorResponse.data;
    throw new InternalServerErrorException({
      message: `${reason} - ${message}`,
      cause: errorCode,
    });
  }

  throw new InternalServerErrorException({
    message: 'Unknown error occurred at the function lambda',
    cause: JSON.stringify(data).slice(0, 100),
  });
}
