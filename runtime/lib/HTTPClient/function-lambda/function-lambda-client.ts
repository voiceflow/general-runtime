import { InternalServerErrorException } from '@voiceflow/exception';
import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

import { FunctionCodeNotFoundException } from './exceptions/function-code-not-found.exception';
import { InvalidRuntimeCommandException } from './exceptions/invalid-runtime-command.exception';
import { LambdaException } from './exceptions/lambda.exception';
import { ModuleResolutionException } from './exceptions/module-resolution.exception';
import { RuntimeErrorException } from './exceptions/runtime-error.exception';
import {
  FunctionLambdaErrorResponse,
  FunctionLambdaErrorResponseDTO,
  FunctionLambdaRequest,
  FunctionLambdaSuccessResponse,
  FunctionLambdaSuccessResponseDTO,
} from './function-lambda-client.interface';
import { LambdaErrorCode } from './lambda-error-code.enum';

export class FunctionLambdaClient {
  private readonly axiosClient: AxiosInstance;

  constructor({
    functionLambdaEndpoint,
    functionLambdaTimeout,
  }: {
    functionLambdaEndpoint?: string | null;
    functionLambdaTimeout?: number;
  }) {
    if (!functionLambdaEndpoint) {
      throw new InternalServerErrorException({
        message: 'Function step lambda endpoint URL `FUNCTION_LAMBDA_ENDPOINT` was not configured',
      });
    }

    this.axiosClient = axios.create({
      baseURL: functionLambdaEndpoint,
      timeout: functionLambdaTimeout,
    });
  }

  private createLambdaException(lambdaError: FunctionLambdaErrorResponse): LambdaException {
    const { errorCode, message } = lambdaError;

    switch (errorCode) {
      case LambdaErrorCode.SandboxRuntimeError:
        return new RuntimeErrorException(message);
      case LambdaErrorCode.SandboxModuleResolution:
        return new ModuleResolutionException(message);
      case LambdaErrorCode.FunctionCodeNotFound:
        return new FunctionCodeNotFoundException();
      default:
        return new LambdaException(message);
    }
  }

  /**
   * Executes the code given in `request` using the `function-lambda` AWS Lambda service.
   */
  public async executeLambda(request: FunctionLambdaRequest): Promise<FunctionLambdaSuccessResponse> {
    try {
      const { data } = await this.axiosClient.post('/run-function', request);
      return FunctionLambdaSuccessResponseDTO.parse(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new InvalidRuntimeCommandException(err);
      }

      const lambdaError = FunctionLambdaErrorResponseDTO.safeParse(err?.response?.data);
      if (lambdaError.success) {
        throw this.createLambdaException(lambdaError.data);
      }

      throw new InternalServerErrorException({
        message: 'Unknown error occurred when executing the function',
        cause: JSON.stringify(err).slice(0, 200),
      });
    }
  }
}
