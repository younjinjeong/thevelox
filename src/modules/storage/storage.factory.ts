import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from './interfaces/storage-provider.interface';
import { OpenstackSwiftProvider } from './providers/openstack-swift.provider';
import { AwsS3Provider } from './providers/aws-s3.provider';
import { GoogleCloudStorageProvider } from './providers/google-cloud-storage.provider';

@Injectable()
export class StorageFactory {
  private readonly logger = new Logger(StorageFactory.name);

  constructor(
    private configService: ConfigService,
    private swiftProvider: OpenstackSwiftProvider,
    private s3Provider: AwsS3Provider,
    private gcsProvider: GoogleCloudStorageProvider,
  ) {}

  getProvider(): StorageProvider {
    const provider = this.configService.get<string>('app.storage.provider');
    this.logger.log(`Initializing storage provider: ${provider}`);

    switch (provider) {
      case 'openstack':
        return this.swiftProvider;
      case 's3':
        return this.s3Provider;
      case 'gcs':
        return this.gcsProvider;
      default:
        throw new Error(`Unknown storage provider: ${provider}`);
    }
  }
}
