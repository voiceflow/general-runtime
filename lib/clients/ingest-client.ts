import { GeneralTrace } from '@voiceflow/general-types';
import { AxiosRequestConfig } from 'axios';

import { State } from '@/runtime/lib/Runtime';

import HttpClient from './http-client';

export interface InteractBody {
  eventId: string;
  request: {
    requestType?: string;
    sessionId?: string;
    versionId?: string;
    payload?: GeneralTrace;
    metadata?: {
      state?: State;
      locale?: string;
      end?: boolean;
    };
  };
}

export enum EventsType {
  INTERACT = 'interact',
}

export class IngestApi extends HttpClient {
  private authorization?: string;

  public constructor(endpoint: string, authorization?: string) {
    super(endpoint);
    this.authorization = authorization;

    this._initializeRequestInterceptor();
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

const IngestAPIClient = (endpoint: string, authorization: string | undefined) => new IngestApi(endpoint, authorization);

export default IngestAPIClient;
