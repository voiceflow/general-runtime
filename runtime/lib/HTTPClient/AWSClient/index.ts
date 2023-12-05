import { S3 } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import consumers from 'node:stream/consumers';

interface S3ClientOptions {
  s3AccessKey?: string;
  s3SecretAccessKey?: string;
  awsRegion?: string;
  s3Endpoint?: string;
}

export function createS3Client({
  s3AccessKey,
  s3SecretAccessKey,
  awsRegion,
  s3Endpoint,
}: S3ClientOptions): S3 | undefined {
  if (!s3AccessKey || !s3SecretAccessKey || !awsRegion) return undefined;

  return new S3({
    credentials: {
      accessKeyId: s3AccessKey,
      secretAccessKey: s3SecretAccessKey,
    },
    region: awsRegion,
    endpoint: s3Endpoint,
  });
}

export async function readFileFromS3(s3Client: S3, Bucket: string, Key: string): Promise<Buffer | null> {
  const { Body } = await s3Client.getObject({
    Bucket,
    Key,
  });
  if (!(Body instanceof Readable)) return null;

  return consumers.buffer(Body);
}
