import { InternalServerErrorException } from '@voiceflow/exception';
import AWS from 'aws-sdk';
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
import { HTTP_STATUS } from '@voiceflow/verror';

export class FunctionLambdaClient {
  private readonly awsLambda: AWS.Lambda;

  private readonly functionLambdaARN: string;

  constructor({
    functionLambdaARN,
    accessKeyId,
    secretAccessKey,
    region,
  }: {
    functionLambdaARN: string | null;
    accessKeyId: string | null;
    secretAccessKey: string | null;
    region: string | null;
  }) {
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

    this.functionLambdaARN = functionLambdaARN;

    AWS.config.update({
      accessKeyId,
      secretAccessKey,
      region,
    });

    this.awsLambda = new AWS.Lambda();
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

  private invokeLambda(request: FunctionLambdaRequest): Promise<FunctionLambdaSuccessResponse> {
    const params: AWS.Lambda.InvocationRequest = {
      FunctionName: this.functionLambdaARN,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(request),
    };

    // Invoke the Lambda function
    return new Promise((resolve, reject) => {
      this.awsLambda.invoke(params, (err, data) => {
        if (err) {
          reject(err);
        } else if (!data.Payload) {
          reject(new Error('Lambda did not send back a response'));
        } else {
          const parsedPayload = JSON.parse(data.Payload as string);
          const responseBody = parsedPayload.body;

          if (parsedPayload.statusCode !== HTTP_STATUS.OK) {
            reject(responseBody);
          } else {
            resolve(responseBody);
          }
        }
      });
    });
  }

  /**
   * Executes the code given in `request` using the `function-lambda` AWS Lambda service.
   */
  public async executeLambda(request: FunctionLambdaRequest): Promise<FunctionLambdaSuccessResponse> {
    try {
      const result = await this.invokeLambda(request);

      return FunctionLambdaSuccessResponseDTO.parse(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new InvalidRuntimeCommandException(err);
      }
  
      const lambdaError = FunctionLambdaErrorResponseDTO.safeParse(err);
      if (lambdaError.success) {
        throw this.createLambdaException(lambdaError.data);
      }
  
      throw new InternalServerErrorException({
        message: 'Unknown error occurred when executing the function',
        cause: JSON.stringify(err).slice(0, 100),
      });
    }
  }
}
