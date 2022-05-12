import Axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export enum Event {
  INTERACT = 'interact',
  TURN = 'turn',
}

export enum RequestType {
  REQUEST = 'request',
  LAUNCH = 'launch',
  RESPONSE = 'response',
}

export interface InteractionBody<M, T> {
  projectID?: string;
  versionID?: string;
  sessionID?: string;
  startTime?: string;
  metadata?: M;
  platform?: string;
  traces?: TraceBody<T>[];
}

export interface TraceBody<T> {
  type?: string;
  format?: string;
  payload?: T;
  startTime?: string;
}

export interface InteractionResponse {
  success: boolean;
}

export class Api<IB extends InteractionBody<unknown, unknown>> {
  private axios: AxiosInstance;

  public constructor(endpoint: string, authorization?: string) {
    const config: AxiosRequestConfig = {
      baseURL: endpoint,
    };

    if (authorization) {
      config.headers = {
        Authorization: authorization,
      };
    }

    this.axios = Axios.create(config);
  }

  public doIngest = async (body: IB) => this.axios.post<InteractionResponse>('/logs/ingest', body);
}

export const Client = (endpoint: string, authorization: string | undefined) => new Api(endpoint, authorization);
