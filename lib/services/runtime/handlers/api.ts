import { APIHandler, APIHandlerConfig } from '@/runtime';
import { Config } from '@/types';

export const getAPIBlockHandlerOptions = (config: Config): Partial<APIHandlerConfig> => ({
  requestTimeoutMs: config.API_REQUEST_TIMEOUT_MS ?? undefined,
  maxResponseBodySizeBytes: config.API_MAX_CONTENT_LENGTH_BYTES ?? undefined,
  maxRequestBodySizeBytes: config.API_MAX_BODY_LENGTH_BYTES ?? undefined,
  awsAccessKey: config.AWS_ACCESS_KEY_ID ?? undefined,
  awsSecretAccessKey: config.AWS_SECRET_ACCESS_KEY ?? undefined,
  awsRegion: config.AWS_REGION ?? undefined,
  s3TLSBucket: config.S3_TLS_BUCKET ?? undefined,
});

export default (config: Config) => APIHandler(getAPIBlockHandlerOptions(config));
