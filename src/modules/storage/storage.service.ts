import { Injectable, Logger } from '@nestjs/common';
import { StorageFactory } from './storage.factory';
import { StorageProvider } from './interfaces/storage-provider.interface';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: StorageProvider;

  constructor(private storageFactory: StorageFactory) {
    this.provider = storageFactory.getProvider();
  }

  // Delegate all methods to the configured provider
  async upload(...args: Parameters<StorageProvider['upload']>) {
    this.logger.debug(`Upload to: ${args[0]}/${args[1]}`);
    return this.provider.upload(...args);
  }

  async download(...args: Parameters<StorageProvider['download']>) {
    this.logger.debug(`Download from: ${args[0]}/${args[1]}`);
    return this.provider.download(...args);
  }

  async delete(...args: Parameters<StorageProvider['delete']>) {
    this.logger.debug(`Delete: ${args[0]}/${args[1]}`);
    return this.provider.delete(...args);
  }

  async copy(...args: Parameters<StorageProvider['copy']>) {
    this.logger.debug(`Copy: ${args[0]}/${args[1]} -> ${args[2]}/${args[3]}`);
    return this.provider.copy(...args);
  }

  async createContainer(...args: Parameters<StorageProvider['createContainer']>) {
    this.logger.log(`Create container: ${args[0]}`);
    return this.provider.createContainer(...args);
  }

  async deleteContainer(...args: Parameters<StorageProvider['deleteContainer']>) {
    this.logger.log(`Delete container: ${args[0]}`);
    return this.provider.deleteContainer(...args);
  }

  async listContainers() {
    return this.provider.listContainers();
  }

  async setContainerAcl(...args: Parameters<StorageProvider['setContainerAcl']>) {
    this.logger.debug(`Set ACL for container: ${args[0]}`);
    return this.provider.setContainerAcl(...args);
  }

  async containerExists(...args: Parameters<StorageProvider['containerExists']>) {
    return this.provider.containerExists(...args);
  }

  async getMetadata(...args: Parameters<StorageProvider['getMetadata']>) {
    return this.provider.getMetadata(...args);
  }

  async setMetadata(...args: Parameters<StorageProvider['setMetadata']>) {
    return this.provider.setMetadata(...args);
  }

  async exists(...args: Parameters<StorageProvider['exists']>) {
    return this.provider.exists(...args);
  }

  async getSignedUrl(...args: Parameters<StorageProvider['getSignedUrl']>) {
    return this.provider.getSignedUrl(...args);
  }

  async listObjects(...args: Parameters<StorageProvider['listObjects']>) {
    return this.provider.listObjects(...args);
  }
}
