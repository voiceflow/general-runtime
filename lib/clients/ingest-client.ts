import { GeneralTrace } from '@voiceflow/general-types';
import Axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

import { State } from '@/runtime/lib/Runtime';

import { RuntimeRequest } from '../services/runtime/types';

export interface TurnBody {
  eventId: Event;
  request: {
    version_id?: string;
    session_id?: string;
    state?: State;
    timestamp?: string;
    metadata?: {
      locale?: string;
      end?: boolean;
    };
  };
}

export interface TurnResponse {
  turn_id: string;
}

export interface InteractBody {
  eventId: Event;
  request: {
    turn_id?: string;
    type?: string;
    format?: string;
    payload?: GeneralTrace | RuntimeRequest;
    timestamp?: string;
  };
}

export enum Event {
  INTERACT = 'interact',
  TURN = 'turn',
}

export class IngestApi {
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

  public doIngest = async (body: InteractBody | TurnBody) => this.axios.post<TurnResponse>('/v1/ingest', body);
}

const IngestClient = (endpoint: string, authorization: string | undefined) => new IngestApi(endpoint, authorization);

export default IngestClient;
