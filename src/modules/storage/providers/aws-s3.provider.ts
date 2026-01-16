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
 * AWS S3 Storage Provider
 *
 * This provider integrates with AWS S3 for object storage.
 * Uses the AWS SDK v3 for S3 operations.
 */
@Injectable()
export class AwsS3Provider implements StorageProvider {
  private readonly logger = new Logger(AwsS3Provider.name);
  private readonly s3Client: S3Client;
  private readonly defaultBucket: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: configService.get<string>('app.storage.s3.region'),
      credentials: {
        accessKeyId: configService.get<string>('app.storage.s3.accessKeyId'),
        secretAccessKey: configService.get<string>('app.storage.s3.secretAccessKey'),
      },
    });
    this.defaultBucket = configService.get<string>('app.storage.s3.bucket');
    this.logger.log(`Initialized AWS S3 provider with region: ${this.configService.get('app.storage.s3.region')}`);
  }

  async createContainer(name: string, options?: CreateContainerOptions): Promise<void> {
    try {
      await this.s3Client.send(new CreateBucketCommand({ Bucket: name }));
      this.logger.log(`Created S3 bucket: ${name}`);
    } catch (error: any) {
      if (error.name !== 'BucketAlreadyOwnedByYou' && error.name !== 'BucketAlreadyExists') {
        throw error;
      }
      this.logger.debug(`Bucket ${name} already exists`);
    }
  }

  async deleteContainer(name: string): Promise<void> {
    await this.s3Client.send(new DeleteBucketCommand({ Bucket: name }));
    this.logger.log(`Deleted S3 bucket: ${name}`);
  }

  async listContainers(): Promise<ContainerInfo[]> {
    const response = await this.s3Client.send(new ListBucketsCommand({}));
    return (response.Buckets || []).map(bucket => ({
      name: bucket.Name,
      createdAt: bucket.CreationDate,
    }));
  }

  async setContainerAcl(name: string, acl: AclConfig): Promise<void> {
    // S3 bucket ACL/policy management
    // TODO: Implement S3 bucket policy for ACL
    this.logger.warn('S3 ACL management not fully implemented');
  }

  async containerExists(name: string): Promise<boolean> {
    try {
      await this.s3Client.send(new HeadObjectCommand({ Bucket: name, Key: '' }));
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
      location: `s3://${container || this.defaultBucket}/${key}`,
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
    // S3 requires copy-in-place to update metadata
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
    return (response.Contents || []).map(obj => obj.Key).filter(Boolean);
  }
}
