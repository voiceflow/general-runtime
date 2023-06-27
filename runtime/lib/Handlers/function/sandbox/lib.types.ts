import { Headers } from 'node-fetch';

export interface FetchResponse {
  body: unknown;
  headers: Headers;
}
