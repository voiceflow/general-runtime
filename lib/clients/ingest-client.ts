import { AxiosRequestConfig } from 'axios';

import HttpClient from './http-client';

export interface InteractBody {
  eventId: string;
  request: {
    userId?: string;
    sessionId?: string;
    versionId?: string;
    payload?: string;
    metadata?: any;
  };
}

export enum EventsType {
  INTERACT = 'interact',
}

export default class IngestApi extends HttpClient {
  private static classInstance?: IngestApi;

  private authorization?: string;

  public constructor(endpoint: string, auhtorization?: string) {
    super(endpoint);
    this.authorization = auhtorization;

    this._initializeRequestInterceptor();
  }

  public static getInstance(endpoint: string, auhtorization: string) {
    if (!this.classInstance) {
      this.classInstance = new IngestApi(endpoint, auhtorization);
    }

    return this.classInstance;
  }

  private _initializeRequestInterceptor = () => {
    this.instance.interceptors.request.use(this._handleRequest, this._handleError);
  };

  private _handleRequest = (config: AxiosRequestConfig) => {
    if (this.authorization) {
      config.headers.Authorization = this.authorization;
    }

    return config;
  };

  protected _handleError = (error: any) => Promise.reject(error);

  public doIngest = (body: InteractBody) => this.instance.post<any>('/v1/ingest', body);
}
