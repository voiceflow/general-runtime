import { Blob, Headers } from 'node-fetch';

export interface FetchResponse {
  statusText: string;
  ok: boolean;
  status: number;
  headers: Headers;

  text?: string;
  json?: unknown;
  blob?: Blob;
  arrayBuffer?: ArrayBuffer;
}

export enum ParseType {
  ArrayBuffer = 'arrayBuffer',
  Blob = 'blob',
  JSON = 'json',
  Text = 'text',
}

export interface ExtendedFetchOptions {
  parseType?: ParseType;
}
