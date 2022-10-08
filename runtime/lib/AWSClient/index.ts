import { S3 } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import consumers from 'node:stream/consumers';

interface S3ClientOptions {
  awsAccessKey?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
}

export function createS3Client({ awsAccessKey, awsSecretAccessKey, awsRegion }: S3ClientOptions): S3 | undefined {
  if (!awsAccessKey || !awsSecretAccessKey || !awsRegion) return undefined;

  return new S3({
    credentials: {
      accessKeyId: awsAccessKey,
      secretAccessKey: awsSecretAccessKey,
    },
    region: awsRegion,
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
