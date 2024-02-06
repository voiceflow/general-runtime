import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { InternalServerErrorException } from '@voiceflow/exception';
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
import { AWSSuccessResponsePayload, AWSSuccessResponsePayloadDTO } from './function-lambda-client.types';
import { LambdaErrorCode } from './lambda-error-code.enum';

export class FunctionLambdaClient {
  private readonly errorLabel: string = 'FUNCTION-LAMBDA-ERROR';

  private readonly infoLabel: string = 'FUNCTION-LAMBDA-INFO';

  private readonly awsLambda: LambdaClient;

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

    this.awsLambda = new LambdaClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
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

  private isLambdaErrorResponse(data: unknown): data is FunctionLambdaErrorResponse {
    return FunctionLambdaErrorResponseDTO.safeParse(data).success;
  }

  private isLambdaSuccessResponse(data: unknown): data is FunctionLambdaSuccessResponse {
    return FunctionLambdaSuccessResponseDTO.safeParse(data).success;
  }

  private getRuntimeCommandErrorDetails(data: unknown): z.ZodError {
    try {
      FunctionLambdaSuccessResponseDTO.parse(data);
      return new z.ZodError([]);
    } catch (err) {
      return err;
    }
  }

  private isAWSSuccessResponsePayload(data: unknown): data is AWSSuccessResponsePayload {
    return AWSSuccessResponsePayloadDTO.safeParse(data).success;
  }

  private logError(errorMessage: string) {
    log.error(`[${this.errorLabel}]: ${errorMessage}`);
  }

  private logInfo(errorMessage: string) {
    log.info(`[${this.infoLabel}]: ${errorMessage}`);
  }

  private async sendInvokeLambdaCommand(request: FunctionLambdaRequest) {
    let startTime = null;
    try {
      startTime = performance.now();

      const command = new InvokeCommand({
        FunctionName: this.functionLambdaARN,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(request),
      });

      const { Payload } = await this.awsLambda.send(command);
      return Payload;
    } finally {
      if (startTime !== null) {
        const timeElapsed = performance.now() - startTime;
        this.logInfo(`Function lambda complete execution, latency = ${timeElapsed} ms`);
      } else {
        this.logInfo(`Unable to report function lambda latency, startTime = ${startTime}`);
      }
    }
  }

  private async invokeLambda(request: FunctionLambdaRequest) {
    const payload = await this.sendInvokeLambdaCommand(request);

    if (!payload) {
      const errMessage = `Expected truthy response payload but instead received payload = ${payload}`;
      this.logError(errMessage);
      throw new Error(errMessage);
    }

    const stringResult = Buffer.from(payload).toString();

    try {
      return JSON.parse(stringResult);
    } catch (err) {
      const errMessage = `Function lambda responded with invalid JSON, data = ${stringResult}`;
      this.logError(errMessage);
      throw new Error(errMessage);
    }
  }

  /**
   * Executes the code given in `request` using the `function-lambda` AWS Lambda service.
   */
  public async executeLambda(request: FunctionLambdaRequest): Promise<FunctionLambdaSuccessResponse> {
    const result = await this.invokeLambda(request);

    if (!this.isAWSSuccessResponsePayload(result)) {
      const errMessage = `Received unexpected payload from function-lambda, payload=${JSON.stringify(
        result,
        null,
        2
      ).substring(0, 32767)}`;
      this.logError(errMessage);
      throw new InternalServerErrorException({
        message: errMessage,
        cause: {
          unexpectedPayload: JSON.stringify(result),
        },
      });
    }

    const { body } = result;

    if (this.isLambdaErrorResponse(body)) {
      this.logError(
        `\`function-lambda\` returned statusCode=${result.statusCode}, payload=${JSON.stringify(
          body,
          null,
          2
        ).substring(0, 32767)}`
      );
      throw this.createLambdaException(body);
    }

    if (this.isLambdaSuccessResponse(body)) {
      return body;
    }

    const zodErrors = this.getRuntimeCommandErrorDetails(body);
    throw new InvalidRuntimeCommandException(zodErrors);
  }
}
