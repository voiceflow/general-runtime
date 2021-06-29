import { GeneralTrace } from '@voiceflow/general-types';
import Axios, { AxiosInstance } from 'axios';

import { State } from '@/runtime/lib/Runtime';

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

export class IngestApi {
  private axios: AxiosInstance;

  public constructor(endpoint: string, authorization?: string) {
    this.axios = Axios.create({
      baseURL: endpoint,
      headers: { Authorization: authorization },
    });
  }

  public doIngest = (body: InteractBody) => this.axios.post('/v1/ingest', body);
}

const IngestAPIClient = (endpoint: string, authorization: string | undefined) => new IngestApi(endpoint, authorization);

export default IngestAPIClient;
