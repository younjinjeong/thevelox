import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage, Bucket, File } from '@google-cloud/storage';
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
 * Google Cloud Storage Provider
 *
 * This provider integrates with Google Cloud Storage for object storage.
 * Uses the @google-cloud/storage SDK.
 */
@Injectable()
export class GoogleCloudStorageProvider implements StorageProvider {
  private readonly logger = new Logger(GoogleCloudStorageProvider.name);
  private readonly storage: Storage;
  private readonly defaultBucket: string;

  constructor(private configService: ConfigService) {
    this.storage = new Storage({
      projectId: configService.get<string>('app.storage.gcs.projectId'),
      keyFilename: configService.get<string>('app.storage.gcs.keyFilename'),
    });
    this.defaultBucket = configService.get<string>('app.storage.gcs.bucket');
    this.logger.log(
      `Initialized Google Cloud Storage provider for project: ${this.configService.get('app.storage.gcs.projectId')}`,
    );
  }

  async createContainer(name: string, options?: CreateContainerOptions): Promise<void> {
    try {
      await this.storage.createBucket(name);
      this.logger.log(`Created GCS bucket: ${name}`);
    } catch (error) {
      if (error.code !== 409) {
        // 409 = already exists
        throw error;
      }
      this.logger.debug(`Bucket ${name} already exists`);
    }
  }

  async deleteContainer(name: string): Promise<void> {
    const bucket = this.storage.bucket(name);
    await bucket.delete();
    this.logger.log(`Deleted GCS bucket: ${name}`);
  }

  async listContainers(): Promise<ContainerInfo[]> {
    const [buckets] = await this.storage.getBuckets();
    return buckets.map(bucket => ({
      name: bucket.name,
      createdAt: new Date(bucket.metadata.timeCreated),
    }));
  }

  async setContainerAcl(name: string, acl: AclConfig): Promise<void> {
    // GCS IAM policy management
    // TODO: Implement GCS bucket IAM policy for ACL
    this.logger.warn('GCS ACL management not fully implemented');
  }

  async containerExists(name: string): Promise<boolean> {
    const bucket = this.storage.bucket(name);
    const [exists] = await bucket.exists();
    return exists;
  }

  async upload(
    container: string,
    key: string,
    stream: Readable,
    metadata?: ObjectMetadata,
  ): Promise<UploadResult> {
    const bucket = this.storage.bucket(container || this.defaultBucket);
    const file = bucket.file(key);

    return new Promise((resolve, reject) => {
      let size = 0;
      stream
        .on('data', chunk => {
          size += chunk.length;
        })
        .pipe(
          file.createWriteStream({
            metadata: {
              contentType: metadata?.contentType,
              metadata: metadata?.customMetadata,
            },
          }),
        )
        .on('error', reject)
        .on('finish', async () => {
          const [fileMetadata] = await file.getMetadata();
          resolve({
            key,
            etag: fileMetadata.etag,
            location: `gs://${container || this.defaultBucket}/${key}`,
            size,
          });
        });
    });
  }

  async download(container: string, key: string): Promise<Readable> {
    const bucket = this.storage.bucket(container || this.defaultBucket);
    const file = bucket.file(key);
    return file.createReadStream();
  }

  async delete(container: string, key: string): Promise<void> {
    const bucket = this.storage.bucket(container || this.defaultBucket);
    const file = bucket.file(key);
    await file.delete();
    this.logger.debug(`Deleted object: ${key} from bucket: ${container}`);
  }

  async copy(
    sourceContainer: string,
    sourceKey: string,
    destContainer: string,
    destKey: string,
  ): Promise<void> {
    const sourceBucket = this.storage.bucket(sourceContainer);
    const sourceFile = sourceBucket.file(sourceKey);
    const destBucket = this.storage.bucket(destContainer || this.defaultBucket);

    await sourceFile.copy(destBucket.file(destKey));
  }

  async getMetadata(container: string, key: string): Promise<ObjectMetadata> {
    const bucket = this.storage.bucket(container || this.defaultBucket);
    const file = bucket.file(key);
    const [metadata] = await file.getMetadata();

    return {
      contentType: metadata.contentType,
      contentLength: parseInt(metadata.size, 10),
      customMetadata: metadata.metadata,
      etag: metadata.etag,
      lastModified: new Date(metadata.updated),
    };
  }

  async setMetadata(container: string, key: string, metadata: ObjectMetadata): Promise<void> {
    const bucket = this.storage.bucket(container || this.defaultBucket);
    const file = bucket.file(key);

    await file.setMetadata({
      contentType: metadata.contentType,
      metadata: metadata.customMetadata,
    });
  }

  async exists(container: string, key: string): Promise<boolean> {
    const bucket = this.storage.bucket(container || this.defaultBucket);
    const file = bucket.file(key);
    const [exists] = await file.exists();
    return exists;
  }

  async getSignedUrl(container: string, key: string, expiresIn: number): Promise<string> {
    const bucket = this.storage.bucket(container || this.defaultBucket);
    const file = bucket.file(key);

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });

    return url;
  }

  async listObjects(container: string, prefix?: string): Promise<string[]> {
    const bucket = this.storage.bucket(container || this.defaultBucket);
    const [files] = await bucket.getFiles({ prefix });
    return files.map(file => file.name);
  }
}
