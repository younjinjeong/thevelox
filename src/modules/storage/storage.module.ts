import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageFactory } from './storage.factory';
import { OpenstackSwiftProvider } from './providers/openstack-swift.provider';
import { AwsS3Provider } from './providers/aws-s3.provider';
import { GoogleCloudStorageProvider } from './providers/google-cloud-storage.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    StorageService,
    StorageFactory,
    OpenstackSwiftProvider,
    AwsS3Provider,
    GoogleCloudStorageProvider,
  ],
  exports: [StorageService],
})
export class StorageModule {}
