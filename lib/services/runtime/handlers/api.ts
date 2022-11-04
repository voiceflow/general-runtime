import { APIHandler, APIHandlerConfig } from '@/runtime';
import { Config } from '@/types';

export const getAPIBlockHandlerOptions = (config: Config): Partial<APIHandlerConfig> => ({
  requestTimeoutMs: config.API_REQUEST_TIMEOUT_MS ?? undefined,
  maxResponseBodySizeBytes: config.API_MAX_CONTENT_LENGTH_BYTES ?? undefined,
  maxRequestBodySizeBytes: config.API_MAX_BODY_LENGTH_BYTES ?? undefined,
  s3AccessKey: config.S3_ACCESS_KEY_ID ?? undefined,
  s3SecretAccessKey: config.S3_SECRET_ACCESS_KEY ?? undefined,
  awsRegion: config.AWS_REGION ?? undefined,
  s3TLSBucket: config.S3_TLS_BUCKET ?? undefined,
  s3Endpoint: config.S3_ENDPOINT ?? '',
});

export default (config: Config) => APIHandler(getAPIBlockHandlerOptions(config));
