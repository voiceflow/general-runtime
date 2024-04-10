export interface APIResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  json: any;
}
