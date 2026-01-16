import { Readable } from 'stream';

export interface ObjectMetadata {
  contentType?: string;
  contentLength?: number;
  customMetadata?: Record<string, string>;
  etag?: string;
  lastModified?: Date;
}

export interface UploadResult {
  key: string;
  etag?: string;
  versionId?: string;
  location?: string;
  size?: number;
}

export interface ContainerInfo {
  name: string;
  createdAt?: Date;
  objectCount?: number;
  size?: number;
}

export interface AclConfig {
  readUsers?: string[];
  writeUsers?: string[];
  public?: boolean;
}

export interface CreateContainerOptions {
  acl?: AclConfig;
  metadata?: Record<string, string>;
}

export interface StorageProvider {
  /**
   * Container/Bucket operations
   */
  createContainer(name: string, options?: CreateContainerOptions): Promise<void>;
  deleteContainer(name: string): Promise<void>;
  listContainers(): Promise<ContainerInfo[]>;
  setContainerAcl(name: string, acl: AclConfig): Promise<void>;
  containerExists(name: string): Promise<boolean>;

  /**
   * Object operations
   */
  upload(
    container: string,
    key: string,
    stream: Readable,
    metadata?: ObjectMetadata,
  ): Promise<UploadResult>;
  download(container: string, key: string): Promise<Readable>;
  delete(container: string, key: string): Promise<void>;
  copy(
    sourceContainer: string,
    sourceKey: string,
    destContainer: string,
    destKey: string,
  ): Promise<void>;

  /**
   * Metadata operations
   */
  getMetadata(container: string, key: string): Promise<ObjectMetadata>;
  setMetadata(container: string, key: string, metadata: ObjectMetadata): Promise<void>;

  /**
   * Utility operations
   */
  exists(container: string, key: string): Promise<boolean>;
  getSignedUrl(container: string, key: string, expiresIn: number): Promise<string>;
  listObjects(container: string, prefix?: string): Promise<string[]>;
}
