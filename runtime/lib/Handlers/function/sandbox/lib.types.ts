import { Headers } from 'node-fetch';

export interface FetchResponse {
  ok: boolean;
  status: number;
  body: unknown;
  headers: Headers;
}
