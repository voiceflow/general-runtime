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
  action?: TraceBody<T>;
  traces?: TraceBody<T>[];
}

export interface TraceBody<T> {
  type?: string;
  payload?: T;
}

export interface InteractionResponse {
  turnID: string;
}
export interface InteractionCountResponse {
  count: number;
}

export class Api<IB extends InteractionBody<unknown, unknown>, TB extends TraceBody<unknown>> {
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

  public ingestInteraction = async (body: IB) => this.axios.post<InteractionResponse>('/transcripts/interaction', body);

  public ingestTrace = async (interactionID: string, body: TB) =>
    this.axios.post<InteractionResponse>(`/transcripts/interaction/${interactionID}/trace`, body);

  public getSessionTranscripts = async (sessionID: string) => this.axios.get<InteractionResponse>(`/transcripts/session/${sessionID}`);

  public getSessionTranscriptsCount = async (sessionID: string) =>
    this.axios.get<InteractionCountResponse>(`/transcripts/session/${sessionID}/count`);
}

export const Client = (endpoint: string, authorization: string | undefined) => new Api(endpoint, authorization);
