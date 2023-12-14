import { InternalServerErrorException } from '@voiceflow/exception';
import { z } from 'zod';

import Config from '@/config';
import { FunctionLambdaClient } from '@/runtime/lib/HTTPClient/function-lambda';

import { RuntimeCommand } from '../../runtime-command/runtime-command.dto';
import { ExecuteLambdaException } from './exceptions/execute-lambda.exception';
import { InvalidRuntimeCommandException } from './exceptions/invalid-runtime-command.exception';
import { ModuleResolutionException } from './exceptions/module-resolution.exception';
import { RuntimeErrorException } from './exceptions/runtime-error.exception';
import { FunctionLambdaErrorResponseDTO, FunctionLambdaSuccessResponseDTO } from './execute-lambda.types';
import { LambdaErrorCode } from './lambda-error-code.enum';

export async function executeLambda(
  code: string,
  variables: Record<string, unknown>,
  enableLog = false
): Promise<RuntimeCommand> {
  const functionLambdaARN = Config.FUNCTION_LAMBDA_ARN;
  const accessKeyId = Config.FUNCTION_LAMBDA_ACCESS_KEY_ID;
  const secretAccessKey = Config.FUNCTION_LAMBDA_SECRET_ACCESS_KEY;
  const region = Config.AWS_REGION;

  if (!functionLambdaARN) {
    throw new InternalServerErrorException({
      message: 'Function step lambda ARN was not configured',
    });
  } else if (!accessKeyId) {
    throw new InternalServerErrorException({
      message: 'Function step lambda access key ID was not configured',
    });
  } else if (!secretAccessKey) {
    throw new InternalServerErrorException({
      message: 'Function step lambda secret access key was not configured',
    });
  } else if (!region) {
    throw new InternalServerErrorException({
      message: 'AWS region was not configured',
    });
  }

  try {
    const lambdaClient = new FunctionLambdaClient({
      functionLambdaARN,
      accessKeyId,
      secretAccessKey,
      region,
    });
    const result = await lambdaClient.executeLambda({
      code,
      variables,
      enableLog,
    });

    return FunctionLambdaSuccessResponseDTO.parse(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new InvalidRuntimeCommandException(err);
    }

    const lambdaError = FunctionLambdaErrorResponseDTO.safeParse(err);
    if (lambdaError.success) {
      const { errorCode, message } = lambdaError.data;

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
  }
}
