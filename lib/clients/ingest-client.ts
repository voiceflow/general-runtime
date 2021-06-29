import { GeneralTrace } from '@voiceflow/general-types';
import Axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

import { State } from '@/runtime/lib/Runtime';

export interface InteractBody {
  eventId: Event;
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

export enum Event {
  INTERACT = 'interact',
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

  public doIngest = async (body: InteractBody) => this.axios.post('/v1/ingest', body);
}

const IngestClient = (endpoint: string, authorization: string | undefined) => new IngestApi(endpoint, authorization);

export default IngestClient;
