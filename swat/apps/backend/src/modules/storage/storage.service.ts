import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../../config/config.service';

const DEFAULT_EXPIRY_SECONDS = 900; // 15 minutes

/**
 * S3-compatible object storage wrapper (MinIO in dev, S3/GCS in prod).
 * The DB stores only object metadata (see Photo model); binary upload/download
 * happens directly between the browser and storage via presigned URLs.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: AppConfigService) {
    const { endpoint, region, bucket, accessKey, secretKey, forcePathStyle } = config.storage;
    this.bucket = bucket;
    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });
  }

  /** Presigned PUT URL the browser uses to upload an object directly. */
  async getPresignedPutUrl(
    key: string,
    contentType: string,
    expiresIn = DEFAULT_EXPIRY_SECONDS,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Presigned GET URL for short-lived read access to a private object. `bucket`
   * defaults to the photo bucket; pass the reports bucket for report downloads.
   */
  async getPresignedGetUrl(
    key: string,
    expiresIn = DEFAULT_EXPIRY_SECONDS,
    bucket = this.bucket,
    responseContentDisposition?: string,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: responseContentDisposition,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /** Server-side upload (e.g. generated thumbnails/reports). */
  async uploadObject(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string,
    bucket = this.bucket,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async deleteObject(key: string, bucket = this.bucket): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    this.logger.log(`Deleted object ${key} from ${bucket}`);
  }
}
