export interface APIHandlerConfig {
  requestTimeoutMs: number;
  maxResponseBodySizeBytes: number;
  maxRequestBodySizeBytes: number;
  s3AccessKey?: string;
  s3SecretAccessKey?: string;
  awsRegion?: string;
  s3TLSBucket?: string;
}

export const DEFAULT_API_HANDLER_CONFIG: APIHandlerConfig = {
  requestTimeoutMs: 20_000,
  maxResponseBodySizeBytes: 1_000_000,
  maxRequestBodySizeBytes: 1_000_000,
};
