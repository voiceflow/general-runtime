import axios, { AxiosInstance } from 'axios';

import { FunctionLambdaRequest } from './interface';

export class FunctionLambdaClient {
  private readonly axiosClient: AxiosInstance;

  constructor(functionLambdaEndpoint: string) {
    this.axiosClient = axios.create({
      baseURL: functionLambdaEndpoint,
      timeout: 3000,
    });
  }

  public async executeLambda(request: FunctionLambdaRequest) {
    return this.axiosClient.post('/run-function', request);
  }
}
