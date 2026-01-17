import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  StorageProvider,
  ObjectMetadata,
  UploadResult,
  ContainerInfo,
  AclConfig,
  CreateContainerOptions,
} from '../interfaces/storage-provider.interface';
import { Readable } from 'stream';

/**
 * MinIO Storage Provider
 *
 * This provider integrates with MinIO (S3-compatible object storage).
 * Uses the AWS SDK v3 with custom endpoint configuration.
 * Key difference from AWS S3: forcePathStyle must be true for MinIO.
 */
@Injectable()
export class MinioProvider implements StorageProvider {
  private readonly logger = new Logger(MinioProvider.name);
  private readonly s3Client: S3Client;
  private readonly defaultBucket: string;

  constructor(private configService: ConfigService) {
    const endpoint = configService.get<string>('app.storage.minio.endpoint');
    const accessKey = configService.get<string>('app.storage.minio.accessKey');
    const secretKey = configService.get<string>('app.storage.minio.secretKey');
    const useSSL = configService.get<boolean>('app.storage.minio.useSSL') || false;
    const region = configService.get<string>('app.storage.minio.region') || 'us-east-1';

    this.s3Client = new S3Client({
      endpoint: endpoint,
      region: region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // Required for MinIO
      tls: useSSL,
    });

    this.defaultBucket = configService.get<string>('app.storage.minio.bucket') || 'velox';
    this.logger.log(`Initialized MinIO provider with endpoint: ${endpoint}`);
  }

  async createContainer(name: string, options?: CreateContainerOptions): Promise<void> {
    try {
      await this.s3Client.send(new CreateBucketCommand({ Bucket: name }));
      this.logger.log(`Created MinIO bucket: ${name}`);
    } catch (error: any) {
      if (error.name !== 'BucketAlreadyOwnedByYou' && error.name !== 'BucketAlreadyExists') {
        throw error;
      }
      this.logger.debug(`Bucket ${name} already exists`);
    }
  }

  async deleteContainer(name: string): Promise<void> {
    await this.s3Client.send(new DeleteBucketCommand({ Bucket: name }));
    this.logger.log(`Deleted MinIO bucket: ${name}`);
  }

  async listContainers(): Promise<ContainerInfo[]> {
    const response = await this.s3Client.send(new ListBucketsCommand({}));
    return (response.Buckets || []).map((bucket) => ({
      name: bucket.Name,
      createdAt: bucket.CreationDate,
    }));
  }

  async setContainerAcl(name: string, acl: AclConfig): Promise<void> {
    // MinIO supports S3 ACL, but for simplicity we'll skip this
    this.logger.warn('MinIO ACL management not fully implemented');
  }

  async containerExists(name: string): Promise<boolean> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: name }));
      return true;
    } catch {
      return false;
    }
  }

  async upload(
    container: string,
    key: string,
    stream: Readable,
    metadata?: ObjectMetadata,
  ): Promise<UploadResult> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    const command = new PutObjectCommand({
      Bucket: container || this.defaultBucket,
      Key: key,
      Body: body,
      ContentType: metadata?.contentType,
      Metadata: metadata?.customMetadata,
    });

    const response = await this.s3Client.send(command);

    return {
      key,
      etag: response.ETag,
      versionId: response.VersionId,
      location: `minio://${container || this.defaultBucket}/${key}`,
      size: body.length,
    };
  }

  async download(container: string, key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: container || this.defaultBucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    return response.Body as Readable;
  }

  async delete(container: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: container || this.defaultBucket,
      Key: key,
    });

    await this.s3Client.send(command);
    this.logger.debug(`Deleted object: ${key} from bucket: ${container}`);
  }

  async copy(
    sourceContainer: string,
    sourceKey: string,
    destContainer: string,
    destKey: string,
  ): Promise<void> {
    const command = new CopyObjectCommand({
      CopySource: `${sourceContainer}/${sourceKey}`,
      Bucket: destContainer || this.defaultBucket,
      Key: destKey,
    });

    await this.s3Client.send(command);
  }

  async getMetadata(container: string, key: string): Promise<ObjectMetadata> {
    const command = new HeadObjectCommand({
      Bucket: container || this.defaultBucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      customMetadata: response.Metadata,
      etag: response.ETag,
      lastModified: response.LastModified,
    };
  }

  async setMetadata(container: string, key: string, metadata: ObjectMetadata): Promise<void> {
    // MinIO (like S3) requires copy-in-place to update metadata
    await this.copy(container, key, container, key);
  }

  async exists(container: string, key: string): Promise<boolean> {
    try {
      await this.getMetadata(container, key);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  async getSignedUrl(container: string, key: string, expiresIn: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: container || this.defaultBucket,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async listObjects(container: string, prefix?: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: container || this.defaultBucket,
      Prefix: prefix,
    });

    const response = await this.s3Client.send(command);
    return (response.Contents || []).map((obj) => obj.Key).filter(Boolean);
  }

  /**
   * Test connection to MinIO
   * Returns true if connection is successful
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.s3Client.send(new ListBucketsCommand({}));
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }
}
