import { InternalServerErrorException } from '@voiceflow/exception';
import { HTTP_STATUS } from '@voiceflow/verror';
import AWS from 'aws-sdk';
import { performance } from 'perf_hooks';
import { z } from 'zod';

import log from '@/logger';

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
  private readonly errorLabel: string = 'FUNCTION-LAMBDA-ERROR';

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

  private serializeAWSError(error: AWS.AWSError) {
    const {
      cause,
      cfId,
      code,
      extendedRequestId,
      hostname,
      message,
      name,
      originalError,
      region,
      requestId,
      retryDelay,
      retryable,
      stack,
      statusCode,
      time,
    } = error;
    return JSON.stringify(
      {
        cause,
        cfId,
        code,
        extendedRequestId,
        hostname,
        message,
        name,
        originalError: {
          cause: originalError?.cause,
          message: originalError?.message,
          name: originalError?.name,
          stack: originalError?.stack?.substring(0, 1000),
        },
        region,
        requestId,
        retryDelay,
        retryable,
        stack: stack?.substring(0, 1000),
        statusCode,
        time,
      },
      null,
      2
    );
  }

  private invokeLambda(request: FunctionLambdaRequest): Promise<FunctionLambdaSuccessResponse> {
    const params: AWS.Lambda.InvocationRequest = {
      FunctionName: this.functionLambdaARN,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(request),
    };

    // Invoke the Lambda function
    return new Promise((resolve, reject) => {
      const startTime = performance.now();

      this.awsLambda.invoke(params, (err, data) => {
        const timeElapsed = performance.now() - startTime;

        if (err) {
          log.error(
            `[${
              this.errorLabel
            }]: \`function-lambda\` invocation returned an error object, latency=${timeElapsed} ms, error=${this.serializeAWSError(
              err
            )}`
          );

          reject(err);
        } else if (!data.Payload) {
          log.error(
            `[${this.errorLabel}]: \`function-lambda\` did not send back a \`data.Payload\` property, latency=${timeElapsed} ms`
          );

          reject(new Error('Lambda did not send back a response'));
        } else {
          const parsedPayload = JSON.parse(data.Payload as string);
          const responseBody = parsedPayload.body;

          if (parsedPayload.statusCode !== HTTP_STATUS.OK) {
            log.error(
              `[${
                this.errorLabel
              }]: Received non-200 status from \`function-lambda\`, latency=${timeElapsed} ms, responseBody=${JSON.stringify(
                responseBody,
                null,
                2
              )}`
            );

            reject(responseBody);
          } else {
            log.info(`Function lambda invocation was resolved, latency=${timeElapsed} ms`);

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

      const errorBody = (err.message ?? JSON.stringify(err, null, 2)).slice(0, 100);

      log.error(`[${this.errorLabel}]: An unknown internal server error occurred, errorBody=${errorBody}`);

      throw new InternalServerErrorException({
        message: 'Unknown error occurred when executing the function',
        cause: errorBody,
      });
    }
  }
}
