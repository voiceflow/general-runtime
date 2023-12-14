import AWS from 'aws-sdk';

import { FunctionLambdaRequest } from './interface';

export class FunctionLambdaClient {
  private readonly awsLambda: AWS.Lambda;

  private readonly functionLambdaARN: string;

  constructor({
    functionLambdaARN,
    accessKeyId,
    secretAccessKey,
    region,
  }: {
    functionLambdaARN: string;
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  }) {
    this.functionLambdaARN = functionLambdaARN;

    AWS.config.update({
      accessKeyId,
      secretAccessKey,
      region,
    });

    this.awsLambda = new AWS.Lambda();
  }

  public async executeLambda(request: FunctionLambdaRequest) {
    const params: AWS.Lambda.InvocationRequest = {
      FunctionName: this.functionLambdaARN,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({ body: JSON.stringify(request) }),
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
          const responseBody = JSON.parse(parsedPayload.body);
          resolve(responseBody);
        }
      });
    });
  }
}
