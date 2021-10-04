import Axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

import { State } from '@/runtime/lib/Runtime';

export enum Event {
  INTERACT = 'interact',
  TURN = 'turn',
}

export enum RequestType {
  REQUEST = 'request',
  LAUNCH = 'launch',
  RESPONSE = 'response',
}

export interface TurnBody<T> {
  eventId: Event;
  request: {
    version_id?: string;
    session_id?: string;
    state?: State;
    timestamp?: string;
    metadata?: T;
  };
}

export interface InteractBody<T> {
  eventId: Event;
  request: {
    turn_id?: string;
    type?: string;
    format?: string;
    payload?: T;
    timestamp?: string;
  };
}

export interface TurnResponse {
  turn_id: string;
}

export class Api<IB extends InteractBody<unknown>, TB extends TurnBody<unknown>> {
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

  public doIngest = async (body: IB | TB) => this.axios.post<TurnResponse>('/v1/ingest', body);
}

export const Client = (endpoint: string, authorization: string | undefined) => new Api(endpoint, authorization);
