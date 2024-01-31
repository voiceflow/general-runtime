import { FunctionLambdaSuccessResponse } from './function-lambda-client.interface';

export interface AWSResponsePayload {
  statusCode: number;
  body: FunctionLambdaSuccessResponse;
}
