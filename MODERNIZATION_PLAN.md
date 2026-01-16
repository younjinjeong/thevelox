# Velox Modernization Plan

## Executive Summary

This document outlines a comprehensive modernization strategy for the Velox enterprise cloud storage platform. The codebase is approximately 14 years old (circa 2012) and requires significant updates to address security vulnerabilities, performance issues, and maintainability concerns.

**Current State**: Node.js 0.8.x, Express 2.x, Socket.IO 0.9.11, Mongoose 3.4.x
**Target State**: Node.js 20+ LTS, Express 5.x, Socket.IO 4.x, Mongoose 8.x, TypeScript
**Technology Debt Score**: 9.5/10 (CRITICAL)

---

## Phase 1: Foundation & Infrastructure (Weeks 1-4)

### 1.1 Runtime & Core Framework Migration

**Priority: CRITICAL**

#### Node.js Upgrade
- **Current**: Node.js 0.8.x (2012, end-of-life)
- **Target**: Node.js 20.x LTS (or latest LTS)
- **Breaking Changes**:
  - Native Promises support (replace callbacks)
  - Async/await syntax available
  - ES6+ module system
  - Buffer API changes
  - Crypto API changes

**Action Items**:
```bash
# Update package.json engines
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

#### Express Framework Upgrade
- **Current**: Express 2.x (via Railway.js wrapper)
- **Target**: Express 5.x or Fastify 4.x (recommended for performance)
- **Challenges**:
  - Railway.js is deprecated/unmaintained
  - Complete MVC framework rewrite needed
  - Middleware signature changes
  - Router API changes

**Migration Strategy**:
1. **Option A - Keep Express**: Migrate to Express 5.x, build custom MVC structure
2. **Option B - NestJS** (RECOMMENDED): Modern TypeScript MVC framework with built-in structure
3. **Option C - Fastify + Custom**: High-performance alternative

**Recommended**: **NestJS** - provides:
- TypeScript-first architecture
- Dependency injection
- Built-in validation (class-validator)
- Swagger/OpenAPI documentation
- WebSocket support (Socket.IO integration)
- Microservices support
- Similar MVC structure to current Railway.js

### 1.2 Database Layer Modernization

**Priority: HIGH**

#### Mongoose Upgrade
- **Current**: Mongoose 3.4.x
- **Target**: Mongoose 8.x
- **Breaking Changes**:
  - Connection API changes
  - Query API changes (callbacks → promises)
  - Schema type strictness
  - Default `_id` type changed
  - `findAndModify` deprecated
  - `useFindAndModify: false` required

**Migration Tasks**:
1. Update all callback-based queries to promises/async-await
2. Add TypeScript interfaces for all schemas
3. Implement schema validation (replace manual validation)
4. Add indexes for performance
5. Implement soft deletes (instead of status flags)
6. Add timestamps plugin to all schemas

**Example Schema Migration**:
```typescript
// Before (Mongoose 3.4)
var UserSchema = new Schema({
  name: String,
  email: String
});

User.find({}, function(err, users) {
  if (err) return callback(err);
  callback(null, users);
});

// After (Mongoose 8.x with TypeScript)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ default: 1 })
  status: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Usage with async/await
const users = await this.userModel.find().exec();
```

#### Database Schema Enhancements
1. **Add Indexes**:
   ```typescript
   @Index({ email: 1 })
   @Index({ name: 1, status: 1 })
   ```

2. **Replace Map-Reduce** with Aggregation Pipeline:
   ```typescript
   // Current: Uses mapReduce for tag counting (slow)
   // New: Aggregation pipeline
   await this.storageModel.aggregate([
     { $match: { box: boxId, status: 1 } },
     { $unwind: '$tags' },
     { $group: { _id: '$tags', count: { $sum: 1 } } },
     { $sort: { count: -1 } }
   ]);
   ```

3. **Transaction Support**:
   ```typescript
   const session = await mongoose.startSession();
   session.startTransaction();
   try {
     await this.fileModel.create([newFile], { session });
     await this.userModel.updateOne(
       { _id: userId },
       { $inc: { usedSpace: fileSize } },
       { session }
     );
     await session.commitTransaction();
   } catch (error) {
     await session.abortTransaction();
     throw error;
   } finally {
     session.endSession();
   }
   ```

### 1.3 TypeScript Migration

**Priority: HIGH**

**Benefits**:
- Type safety across entire codebase
- Better IDE support and autocomplete
- Catch errors at compile time
- Self-documenting code
- Easier refactoring

**Migration Strategy**:
1. Initialize TypeScript configuration
2. Rename `.js` → `.ts` incrementally
3. Add type definitions for all models
4. Create DTOs (Data Transfer Objects) for API requests/responses
5. Use strict mode

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.4 Environment & Configuration Management

**Priority: CRITICAL (Security)**

**Current Issues**:
- Plaintext credentials in JSON files
- Hardcoded secrets
- No environment-based configuration

**Solution**: Use environment variables + validation

**Recommended Tools**:
- `dotenv` for local development
- `@nestjs/config` for NestJS integration
- `joi` or `class-validator` for validation

**Example**:
```typescript
// config/configuration.ts
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    uri: process.env.MONGODB_URI,
    name: process.env.MONGODB_NAME,
  },

  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },

  session: {
    secret: process.env.SESSION_SECRET,
    ttl: parseInt(process.env.SESSION_TTL, 10) || 86400,
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER, // 'openstack', 's3', 'gcs'
    openstack: {
      authUrl: process.env.OPENSTACK_AUTH_URL,
      tenantId: process.env.OPENSTACK_TENANT_ID,
    },
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_S3_BUCKET,
    },
    gcs: {
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GCP_KEY_FILE,
      bucket: process.env.GCS_BUCKET,
    },
  },

  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    from: process.env.EMAIL_FROM,
  },
}));
```

**Environment Validation**:
```typescript
import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required(),
  SESSION_SECRET: Joi.string().min(32).required(),
  STORAGE_PROVIDER: Joi.string().valid('openstack', 's3', 'gcs').required(),
  // ... more validations
});
```

---

## Phase 2: Storage Abstraction Layer (Weeks 5-8)

### 2.1 Multi-Cloud Storage Strategy

**Objective**: Support OpenStack Swift, AWS S3, and Google Cloud Storage

**Architecture**: Storage Provider Pattern with Plugin System

```
┌─────────────────────────────────────────┐
│       Storage Service Interface         │
│  (upload, download, delete, copy, etc)  │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │  StorageFactory │
       └───────┬─────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐  ┌──▼───┐  ┌───▼────┐
│ Swift │  │  S3  │  │  GCS   │
│Provider│ │Provider│ │Provider│
└───────┘  └──────┘  └────────┘
```

### 2.2 Storage Interface Definition

```typescript
// src/storage/interfaces/storage-provider.interface.ts
export interface StorageProvider {
  // Container/Bucket operations
  createContainer(name: string, options?: CreateContainerOptions): Promise<void>;
  deleteContainer(name: string): Promise<void>;
  listContainers(): Promise<ContainerInfo[]>;
  setContainerAcl(name: string, acl: AclConfig): Promise<void>;

  // Object operations
  upload(container: string, key: string, stream: Readable, metadata?: ObjectMetadata): Promise<UploadResult>;
  download(container: string, key: string): Promise<Readable>;
  delete(container: string, key: string): Promise<void>;
  copy(sourceContainer: string, sourceKey: string, destContainer: string, destKey: string): Promise<void>;

  // Metadata operations
  getMetadata(container: string, key: string): Promise<ObjectMetadata>;
  setMetadata(container: string, key: string, metadata: ObjectMetadata): Promise<void>;

  // Utility operations
  exists(container: string, key: string): Promise<boolean>;
  getSignedUrl(container: string, key: string, expiresIn: number): Promise<string>;
}

export interface ObjectMetadata {
  contentType?: string;
  contentLength?: number;
  customMetadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  etag?: string;
  versionId?: string;
  location?: string;
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
```

### 2.3 OpenStack Swift Provider Implementation

```typescript
// src/storage/providers/openstack-swift.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, ObjectMetadata, UploadResult } from '../interfaces/storage-provider.interface';
import { Readable } from 'stream';
import * as request from 'request';

@Injectable()
export class OpenstackSwiftProvider implements StorageProvider {
  private readonly logger = new Logger(OpenstackSwiftProvider.name);
  private readonly authUrl: string;
  private readonly tenantId: string;
  private tokenCache: { token: string; expires: Date } | null = null;

  constructor(private configService: ConfigService) {
    this.authUrl = configService.get<string>('app.storage.openstack.authUrl');
    this.tenantId = configService.get<string>('app.storage.openstack.tenantId');
  }

  private async getToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expires > new Date()) {
      return this.tokenCache.token;
    }

    // Authenticate with Keystone
    const response = await this.authenticateWithKeystone();
    this.tokenCache = {
      token: response.token,
      expires: new Date(Date.now() + 3600000), // 1 hour
    };
    return this.tokenCache.token;
  }

  private async authenticateWithKeystone(): Promise<{ token: string; storageUrl: string }> {
    // Implementation of Keystone authentication
    // Migrate from app/services/openstack/keystone.js
    throw new Error('Not implemented');
  }

  async createContainer(name: string, options?: any): Promise<void> {
    const token = await this.getToken();
    // Swift create container API call
    throw new Error('Not implemented');
  }

  async upload(container: string, key: string, stream: Readable, metadata?: ObjectMetadata): Promise<UploadResult> {
    const token = await this.getToken();
    // Swift upload implementation with streaming
    throw new Error('Not implemented');
  }

  // ... implement remaining interface methods
}
```

### 2.4 AWS S3 Provider Implementation

```typescript
// src/storage/providers/aws-s3.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand, HeadObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider, ObjectMetadata, UploadResult } from '../interfaces/storage-provider.interface';
import { Readable } from 'stream';

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
  }

  async createContainer(name: string, options?: any): Promise<void> {
    try {
      await this.s3Client.send(new CreateBucketCommand({ Bucket: name }));
      this.logger.log(`Created S3 bucket: ${name}`);
    } catch (error) {
      if (error.name !== 'BucketAlreadyOwnedByYou') {
        throw error;
      }
    }
  }

  async upload(container: string, key: string, stream: Readable, metadata?: ObjectMetadata): Promise<UploadResult> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
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
    this.logger.log(`Deleted object: ${key} from bucket: ${container}`);
  }

  async copy(sourceContainer: string, sourceKey: string, destContainer: string, destKey: string): Promise<void> {
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
    } catch (error) {
      if (error.name === 'NotFound') {
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

  async deleteContainer(name: string): Promise<void> {
    // S3 requires bucket to be empty before deletion
    // Implementation needed with list + delete all objects
    throw new Error('Not implemented');
  }

  async listContainers(): Promise<any[]> {
    // List S3 buckets
    throw new Error('Not implemented');
  }

  async setContainerAcl(name: string, acl: any): Promise<void> {
    // S3 bucket ACL/policy management
    throw new Error('Not implemented');
  }
}
```

### 2.5 Google Cloud Storage Provider Implementation

```typescript
// src/storage/providers/google-cloud-storage.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage, Bucket, File } from '@google-cloud/storage';
import { StorageProvider, ObjectMetadata, UploadResult } from '../interfaces/storage-provider.interface';
import { Readable } from 'stream';

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
  }

  async createContainer(name: string, options?: any): Promise<void> {
    try {
      await this.storage.createBucket(name);
      this.logger.log(`Created GCS bucket: ${name}`);
    } catch (error) {
      if (error.code !== 409) { // Already exists
        throw error;
      }
    }
  }

  async upload(container: string, key: string, stream: Readable, metadata?: ObjectMetadata): Promise<UploadResult> {
    const bucket = this.storage.bucket(container || this.defaultBucket);
    const file = bucket.file(key);

    return new Promise((resolve, reject) => {
      stream
        .pipe(file.createWriteStream({
          metadata: {
            contentType: metadata?.contentType,
            metadata: metadata?.customMetadata,
          },
        }))
        .on('error', reject)
        .on('finish', async () => {
          const [fileMetadata] = await file.getMetadata();
          resolve({
            key,
            etag: fileMetadata.etag,
            location: `gs://${container || this.defaultBucket}/${key}`,
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
    this.logger.log(`Deleted object: ${key} from bucket: ${container}`);
  }

  async copy(sourceContainer: string, sourceKey: string, destContainer: string, destKey: string): Promise<void> {
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

  async deleteContainer(name: string): Promise<void> {
    const bucket = this.storage.bucket(name);
    await bucket.delete();
  }

  async listContainers(): Promise<any[]> {
    const [buckets] = await this.storage.getBuckets();
    return buckets.map(bucket => ({
      name: bucket.name,
      createdAt: new Date(bucket.metadata.timeCreated),
    }));
  }

  async setContainerAcl(name: string, acl: any): Promise<void> {
    // GCS IAM policy management
    throw new Error('Not implemented');
  }
}
```

### 2.6 Storage Factory & Service

```typescript
// src/storage/storage.factory.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from './interfaces/storage-provider.interface';
import { OpenstackSwiftProvider } from './providers/openstack-swift.provider';
import { AwsS3Provider } from './providers/aws-s3.provider';
import { GoogleCloudStorageProvider } from './providers/google-cloud-storage.provider';

@Injectable()
export class StorageFactory {
  constructor(
    private configService: ConfigService,
    private swiftProvider: OpenstackSwiftProvider,
    private s3Provider: AwsS3Provider,
    private gcsProvider: GoogleCloudStorageProvider,
  ) {}

  getProvider(): StorageProvider {
    const provider = this.configService.get<string>('app.storage.provider');

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

// src/storage/storage.service.ts
import { Injectable } from '@nestjs/common';
import { StorageFactory } from './storage.factory';
import { StorageProvider } from './interfaces/storage-provider.interface';

@Injectable()
export class StorageService {
  private readonly provider: StorageProvider;

  constructor(private storageFactory: StorageFactory) {
    this.provider = storageFactory.getProvider();
  }

  // Delegate all methods to the configured provider
  async upload(...args: Parameters<StorageProvider['upload']>) {
    return this.provider.upload(...args);
  }

  async download(...args: Parameters<StorageProvider['download']>) {
    return this.provider.download(...args);
  }

  async delete(...args: Parameters<StorageProvider['delete']>) {
    return this.provider.delete(...args);
  }

  // ... delegate remaining methods
}

// src/storage/storage.module.ts
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
```

### 2.7 Migration Strategy for Existing Data

**Challenge**: Existing files stored in OpenStack Swift need to remain accessible

**Solutions**:

**Option A - Dual Provider Support** (RECOMMENDED for gradual migration):
```typescript
// Support reading from old provider while writing to new
export class HybridStorageService {
  async download(container: string, key: string): Promise<Readable> {
    // Try new provider first
    try {
      return await this.newProvider.download(container, key);
    } catch (error) {
      // Fall back to legacy Swift
      return await this.swiftProvider.download(container, key);
    }
  }
}
```

**Option B - Data Migration Script**:
```typescript
// scripts/migrate-storage.ts
async function migrateStorage() {
  const sourceProvider = new OpenstackSwiftProvider(config);
  const destProvider = new AwsS3Provider(config);

  const containers = await sourceProvider.listContainers();

  for (const container of containers) {
    await destProvider.createContainer(container.name);

    // List all objects in container
    // Download from Swift, upload to S3
    // Update MongoDB references
  }
}
```

**Option C - Lazy Migration**:
- Keep existing files in Swift
- New uploads go to S3/GCS
- Migrate files on access (copy to new provider, update DB)

---

## Phase 3: API & Authentication Layer (Weeks 9-12)

### 3.1 RESTful API Design

**Current State**: Railway.js MVC routes with session-based auth
**Target State**: RESTful API with JWT authentication, OpenAPI documentation

#### API Structure

```
/api/v1
  /auth
    POST   /register
    POST   /login
    POST   /logout
    POST   /refresh
    POST   /forgot-password
    POST   /reset-password
    GET    /me

  /users
    GET    /:id
    PATCH  /:id
    DELETE /:id
    GET    /:id/boxes
    GET    /:id/usage

  /boxes
    GET    /
    POST   /
    GET    /:id
    PATCH  /:id
    DELETE /:id
    POST   /:id/archive
    POST   /:id/restore

    GET    /:id/files
    POST   /:id/files
    GET    /:id/files/:fileId
    PATCH  /:id/files/:fileId
    DELETE /:id/files/:fileId
    POST   /:id/files/:fileId/versions
    GET    /:id/files/:fileId/versions
    GET    /:id/files/:fileId/download
    POST   /:id/files/bulk-download

    GET    /:id/tags
    POST   /:id/tags
    PATCH  /:id/tags/:tagId
    DELETE /:id/tags/:tagId
    POST   /:id/tags/reorder

    GET    /:id/members
    POST   /:id/members
    DELETE /:id/members/:userId

    GET    /:id/notes
    POST   /:id/notes
    PATCH  /:id/notes/:noteId
    DELETE /:id/notes/:noteId

  /files
    GET    /:id/thumbnail
    GET    /:id/preview
    POST   /:id/copy
    POST   /:id/restore

  /share
    POST   /links
    GET    /links/:token
    POST   /links/:token/auth
    GET    /links/:token/files/:fileId/download

  /delivery
    GET    /sendbox/:userId/:boxId
    POST   /sendbox/:userId/:boxId/upload
    POST   /sendbox/:userId/:boxId/auth
```

### 3.2 JWT Authentication Implementation

```typescript
// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user._id,
      email: user.email
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findById(payload.sub);
      return this.login(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}

// src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

### 3.3 Request Validation & DTOs

```typescript
// src/files/dto/upload-file.dto.ts
import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadFileDto {
  @ApiProperty({ description: 'File name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'File description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Tags to assign', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'File ID to create new version', type: String })
  @IsOptional()
  @IsString()
  versionOf?: string;
}

// src/boxes/dto/create-box.dto.ts
import { IsString, IsOptional, IsEnum, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoxType } from '../enums/box-type.enum';

export class CreateBoxDto {
  @ApiProperty({ description: 'Box name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Box description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Box type', enum: BoxType })
  @IsEnum(BoxType)
  type: BoxType;

  @ApiPropertyOptional({ description: 'Initial members', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  members?: string[];
}

// Usage in controller
@Controller('api/v1/boxes')
@UseGuards(JwtAuthGuard)
export class BoxesController {
  @Post()
  @ApiOperation({ summary: 'Create new box' })
  @ApiResponse({ status: 201, description: 'Box created successfully' })
  async create(
    @Body() createBoxDto: CreateBoxDto,
    @Request() req,
  ) {
    return this.boxesService.create(createBoxDto, req.user);
  }
}
```

### 3.4 Role-Based Access Control (RBAC)

```typescript
// src/common/enums/role.enum.ts
export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  ORGANIZER = 'organizer', // Box owner
  MEMBER = 'member', // Box member
}

// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// Usage
@Delete(':id')
@Roles(Role.ADMIN, Role.ORGANIZER)
@UseGuards(JwtAuthGuard, RolesGuard)
async deleteBox(@Param('id') id: string, @Request() req) {
  return this.boxesService.delete(id, req.user);
}
```

### 3.5 OpenAPI/Swagger Documentation

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Velox API')
    .setDescription('Enterprise Cloud Storage API')
    .setVersion('2.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('boxes', 'Box/project management')
    .addTag('files', 'File operations')
    .addTag('users', 'User management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
```

---

## Phase 4: WebSocket & Real-Time Features (Weeks 13-14)

### 4.1 Socket.IO Upgrade & Integration

**Current**: Separate WebSocket server (socket.js) running Socket.IO 0.9.11
**Target**: Integrated Socket.IO 4.x within NestJS application

```typescript
// src/realtime/realtime.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>
  private readonly boxRooms = new Map<string, Set<string>>(); // boxId -> Set<userId>

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.cleanupClient(client);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join-box')
  async handleJoinBox(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boxId: string; userId: string },
  ) {
    const { boxId, userId } = data;

    // Add client to room
    client.join(`box:${boxId}`);

    // Track user connection
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(client.id);

    // Track box membership
    if (!this.boxRooms.has(boxId)) {
      this.boxRooms.set(boxId, new Set());
    }
    this.boxRooms.get(boxId).add(userId);

    // Notify others in the box
    client.to(`box:${boxId}`).emit('user-joined', {
      userId,
      boxId,
      onlineCount: this.boxRooms.get(boxId).size,
    });

    // Send current online users to the new client
    client.emit('online-users', {
      users: Array.from(this.boxRooms.get(boxId)),
      count: this.boxRooms.get(boxId).size,
    });
  }

  @SubscribeMessage('leave-box')
  async handleLeaveBox(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boxId: string; userId: string },
  ) {
    const { boxId, userId } = data;

    client.leave(`box:${boxId}`);

    // Update tracking
    this.boxRooms.get(boxId)?.delete(userId);

    // Notify others
    client.to(`box:${boxId}`).emit('user-left', {
      userId,
      boxId,
      onlineCount: this.boxRooms.get(boxId)?.size || 0,
    });
  }

  // File operation notifications
  notifyFileUploaded(boxId: string, fileData: any) {
    this.server.to(`box:${boxId}`).emit('file-uploaded', fileData);
  }

  notifyFileDeleted(boxId: string, fileId: string) {
    this.server.to(`box:${boxId}`).emit('file-deleted', { fileId });
  }

  notifyFileUpdated(boxId: string, fileData: any) {
    this.server.to(`box:${boxId}`).emit('file-updated', fileData);
  }

  notifyNoteCreated(boxId: string, noteData: any) {
    this.server.to(`box:${boxId}`).emit('note-created', noteData);
  }

  // Selection sharing
  @SubscribeMessage('selection-changed')
  handleSelectionChanged(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boxId: string; userId: string; selectedFiles: string[] },
  ) {
    client.to(`box:${data.boxId}`).emit('user-selection-changed', data);
  }

  private cleanupClient(client: Socket) {
    // Remove from all tracking structures
    for (const [userId, socketIds] of this.userSockets.entries()) {
      socketIds.delete(client.id);
      if (socketIds.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }
}

// src/realtime/realtime.module.ts
import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}

// Usage from services
@Injectable()
export class FilesService {
  constructor(private realtimeGateway: RealtimeGateway) {}

  async uploadFile(boxId: string, fileData: any) {
    // ... upload logic

    // Notify connected users
    this.realtimeGateway.notifyFileUploaded(boxId, fileData);

    return file;
  }
}
```

### 4.2 WebSocket Authentication Guard

```typescript
// src/auth/guards/ws-jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractTokenFromSocket(client);

    if (!token) {
      throw new WsException('Unauthorized');
    }

    try {
      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      return true;
    } catch {
      throw new WsException('Unauthorized');
    }
  }

  private extractTokenFromSocket(client: Socket): string | undefined {
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization;
    return token?.replace('Bearer ', '');
  }
}
```

---

## Phase 5: Frontend Modernization (Weeks 15-20)

### 5.1 Frontend Technology Stack

**Current**: Backbone.js + Prototype.js + jQuery (2012-era)
**Recommended**: React 18+ with TypeScript + Vite

**Alternative Options**:
- Vue 3 + TypeScript + Vite
- Svelte + SvelteKit
- Angular 17+

**Recommended Stack**:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "socket.io-client": "^4.6.0",
    "zustand": "^4.4.0",
    "react-dropzone": "^14.2.0",
    "react-window": "^1.8.10",
    "@dnd-kit/core": "^6.1.0",
    "react-hot-toast": "^2.4.1",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.1.0"
  }
}
```

### 5.2 Project Structure

```
client/
├── src/
│   ├── api/           # API client & hooks
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── boxes.ts
│   │   ├── files.ts
│   │   └── hooks/
│   ├── components/    # Reusable components
│   │   ├── ui/       # Base UI components
│   │   ├── file/     # File-related components
│   │   ├── box/      # Box-related components
│   │   └── layout/   # Layout components
│   ├── pages/         # Route pages
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Box.tsx
│   │   └── Settings.tsx
│   ├── hooks/         # Custom hooks
│   ├── store/         # State management
│   ├── types/         # TypeScript types
│   ├── utils/         # Utilities
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── vite.config.ts
└── tsconfig.json
```

### 5.3 Key Components

**File Upload Component**:
```typescript
// src/components/file/FileUpload.tsx
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { useUploadFiles } from '@/api/hooks/useFiles';

interface FileUploadProps {
  boxId: string;
  onUploadComplete?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ boxId, onUploadComplete }) => {
  const { mutateAsync: uploadFiles, isPending } = useUploadFiles(boxId);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      await uploadFiles(acceptedFiles);
      onUploadComplete?.();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [uploadFiles, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isPending,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-2 text-sm text-gray-600">
        {isDragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
      </p>
      {isPending && <p className="mt-2 text-sm text-blue-600">Uploading...</p>}
    </div>
  );
};
```

**File List with Virtual Scrolling**:
```typescript
// src/components/file/FileList.tsx
import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { FileItem } from './FileItem';
import { File } from '@/types/file';

interface FileListProps {
  files: File[];
  onFileSelect: (file: File) => void;
  selectedFiles: Set<string>;
}

export const FileList: React.FC<FileListProps> = ({ files, onFileSelect, selectedFiles }) => {
  const Row = ({ index, style }: any) => (
    <div style={style}>
      <FileItem
        file={files[index]}
        isSelected={selectedFiles.has(files[index]._id)}
        onSelect={() => onFileSelect(files[index])}
      />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={files.length}
      itemSize={60}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

**Real-time WebSocket Hook**:
```typescript
// src/hooks/useRealtimeBox.ts
import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';

export const useRealtimeBox = (boxId: string) => {
  const token = useAuthStore(state => state.token);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    const newSocket = io(`${import.meta.env.VITE_API_URL}/realtime`, {
      auth: { token },
    });

    newSocket.on('connect', () => {
      newSocket.emit('join-box', { boxId, userId: authStore.user.id });
    });

    newSocket.on('online-users', (data) => {
      setOnlineUsers(data.users);
    });

    newSocket.on('file-uploaded', (fileData) => {
      // Invalidate query cache to refetch files
      queryClient.invalidateQueries(['files', boxId]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave-box', { boxId, userId: authStore.user.id });
      newSocket.disconnect();
    };
  }, [boxId, token]);

  return { socket, onlineUsers };
};
```

### 5.4 State Management with Zustand

```typescript
// src/store/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

// src/store/ui.ts
import { create } from 'zustand';

interface UIState {
  viewType: 'list' | 'grid';
  theme: 'light' | 'dark';
  setViewType: (type: 'list' | 'grid') => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewType: 'list',
  theme: 'light',
  setViewType: (viewType) => set({ viewType }),
  setTheme: (theme) => set({ theme }),
}));
```

### 5.5 API Integration with React Query

```typescript
// src/api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/store/auth';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// src/api/hooks/useFiles.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { File } from '@/types/file';

export const useFiles = (boxId: string) => {
  return useQuery({
    queryKey: ['files', boxId],
    queryFn: async () => {
      const { data } = await apiClient.get<File[]>(`/boxes/${boxId}/files`);
      return data;
    },
  });
};

export const useUploadFiles = (boxId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const { data } = await apiClient.post(`/boxes/${boxId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', boxId] });
    },
  });
};

export const useDeleteFile = (boxId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      await apiClient.delete(`/boxes/${boxId}/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', boxId] });
    },
  });
};
```

---

## Phase 6: Security Hardening (Weeks 21-22)

### 6.1 Authentication Security

**Implement**:
1. **Password Hashing** with bcrypt (remove Keystone dependency)
   ```typescript
   import * as bcrypt from 'bcrypt';

   const SALT_ROUNDS = 12;
   const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
   ```

2. **JWT Security Best Practices**:
   - Short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (7 days)
   - Refresh token rotation
   - Token blacklisting for logout

3. **Rate Limiting**:
   ```typescript
   import { ThrottlerModule } from '@nestjs/throttler';

   ThrottlerModule.forRoot({
     ttl: 60,
     limit: 10, // 10 requests per minute
   });
   ```

4. **Two-Factor Authentication (2FA)**:
   ```typescript
   import * as speakeasy from 'speakeasy';

   const secret = speakeasy.generateSecret({ name: 'Velox' });
   const verified = speakeasy.totp.verify({
     secret: user.twoFactorSecret,
     encoding: 'base32',
     token: userProvidedToken,
   });
   ```

### 6.2 Input Validation & Sanitization

```typescript
// Global validation pipe with sanitization
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,              // Strip non-whitelisted properties
  forbidNonWhitelisted: true,   // Throw error on non-whitelisted
  transform: true,              // Auto-transform to DTO types
  transformOptions: {
    enableImplicitConversion: true,
  },
}));

// File upload validation
import { FileTypeValidator, MaxFileSizeValidator, ParseFilePipe } from '@nestjs/common';

@Post('upload')
uploadFile(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 * 1024 }), // 5GB
        new FileTypeValidator({ fileType: /image|video|application/ }),
      ],
    }),
  )
  file: Express.Multer.File,
) {}
```

### 6.3 CSRF Protection

```typescript
import * as csurf from 'csurf';

app.use(csurf({ cookie: true }));

// In controller
@Get('csrf-token')
getCsrfToken(@Req() req) {
  return { csrfToken: req.csrfToken() };
}
```

### 6.4 Helmet Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

### 6.5 Secrets Management

**Use environment variables + secret manager**:

**Option A - AWS Secrets Manager**:
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

async function getSecret(secretName: string) {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  return JSON.parse(response.SecretString);
}
```

**Option B - HashiCorp Vault**:
```typescript
import * as vault from 'node-vault';

const client = vault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN,
});

const secrets = await client.read('secret/data/velox');
```

**Option C - Docker Secrets** (for containerized deployment):
```typescript
import { readFileSync } from 'fs';

const getDockerSecret = (secretName: string) => {
  try {
    return readFileSync(`/run/secrets/${secretName}`, 'utf8').trim();
  } catch {
    return process.env[secretName];
  }
};
```

### 6.6 File Upload Security

```typescript
// Validate MIME types (don't trust client)
import * as fileType from 'file-type';

async function validateFileType(buffer: Buffer) {
  const type = await fileType.fromBuffer(buffer);
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

  if (!type || !allowedTypes.includes(type.mime)) {
    throw new BadRequestException('Invalid file type');
  }
}

// Scan for malware (ClamAV integration)
import { NodeClam } from 'clamscan';

const clam = new NodeClam().init({
  clamdscan: { host: 'localhost', port: 3310 },
});

const { isInfected } = await clam.scanFile(filePath);
if (isInfected) {
  throw new BadRequestException('Malware detected');
}
```

---

## Phase 7: Testing & Quality Assurance (Weeks 23-24)

### 7.1 Testing Strategy

**Test Pyramid**:
```
       ┌──────────┐
       │   E2E    │  10%
       ├──────────┤
       │Integration│ 30%
       ├──────────┤
       │   Unit   │  60%
       └──────────┘
```

### 7.2 Unit Testing

```typescript
// Example: Storage service unit test
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { StorageFactory } from './storage.factory';
import { AwsS3Provider } from './providers/aws-s3.provider';

describe('StorageService', () => {
  let service: StorageService;
  let s3Provider: jest.Mocked<AwsS3Provider>;

  beforeEach(async () => {
    const mockS3Provider = {
      upload: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
    };

    const mockFactory = {
      getProvider: jest.fn().mockReturnValue(mockS3Provider),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: StorageFactory, useValue: mockFactory },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    s3Provider = mockS3Provider as any;
  });

  describe('upload', () => {
    it('should upload file to storage provider', async () => {
      const mockStream = Buffer.from('test');
      s3Provider.upload.mockResolvedValue({ key: 'test.txt' });

      await service.upload('bucket', 'test.txt', mockStream as any);

      expect(s3Provider.upload).toHaveBeenCalledWith('bucket', 'test.txt', mockStream, undefined);
    });
  });
});
```

### 7.3 Integration Testing

```typescript
// Example: Files API integration test
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Files API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'test', password: 'test' });
    authToken = loginResponse.body.access_token;
  });

  describe('POST /api/v1/boxes/:boxId/files', () => {
    it('should upload a file', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/boxes/123/files')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', './test/fixtures/sample.pdf')
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('sample.pdf');
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/boxes/123/files')
        .attach('file', './test/fixtures/sample.pdf')
        .expect(401);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### 7.4 E2E Testing with Playwright

```typescript
// tests/e2e/upload.spec.ts
import { test, expect } from '@playwright/test';

test.describe('File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should upload file via drag and drop', async ({ page }) => {
    await page.goto('/boxes/123');

    // Create a file to upload
    const buffer = Buffer.from('test file content');
    const dataTransfer = await page.evaluateHandle((data) => {
      const dt = new DataTransfer();
      const file = new File([data], 'test.txt', { type: 'text/plain' });
      dt.items.add(file);
      return dt;
    }, buffer);

    // Simulate drag and drop
    await page.dispatchEvent('[data-testid="upload-zone"]', 'drop', { dataTransfer });

    // Wait for upload to complete
    await expect(page.locator('text=test.txt')).toBeVisible();
  });
});
```

---

## Phase 8: Performance Optimization (Weeks 25-26)

### 8.1 Database Optimization

**Indexing Strategy**:
```typescript
// Add indexes to schemas
@Schema()
export class StorageObject {
  @Index({ box: 1, status: 1 })
  @Index({ box: 1, uploadDate: -1 })
  @Index({ tags: 1 })
  @Index({ name: 'text' }) // Text search
  // ... fields
}

// Compound indexes for common queries
StorageObjectSchema.index({ box: 1, status: 1, uploadDate: -1 });
```

**Query Optimization**:
```typescript
// Use lean() for read-only queries (skip hydration)
const files = await this.fileModel
  .find({ box: boxId, status: 1 })
  .select('name size uploadDate')
  .lean()
  .exec();

// Use projection to fetch only needed fields
const files = await this.fileModel
  .find({ box: boxId })
  .select('name size')
  .exec();

// Pagination with cursor-based approach
const files = await this.fileModel
  .find({ box: boxId, _id: { $gt: lastId } })
  .limit(50)
  .sort({ _id: 1 })
  .exec();
```

### 8.2 Caching Strategy

**Redis Caching**:
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class FilesService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getFile(id: string) {
    const cacheKey = `file:${id}`;

    // Try cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const file = await this.fileModel.findById(id).lean().exec();

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, file, 300);

    return file;
  }

  async updateFile(id: string, updates: any) {
    const file = await this.fileModel.findByIdAndUpdate(id, updates, { new: true });

    // Invalidate cache
    await this.cacheManager.del(`file:${id}`);

    return file;
  }
}

// Cache module configuration
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

CacheModule.register({
  store: redisStore,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  ttl: 300, // 5 minutes default
});
```

### 8.3 File Upload Optimization

**Multipart Upload for Large Files**:
```typescript
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';

async function multipartUpload(bucket: string, key: string, stream: Readable) {
  const s3 = new S3Client({});
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

  // Initiate multipart upload
  const { UploadId } = await s3.send(new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
  }));

  const parts: any[] = [];
  let partNumber = 1;
  let buffer = Buffer.alloc(0);

  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);

    if (buffer.length >= CHUNK_SIZE) {
      const { ETag } = await s3.send(new UploadPartCommand({
        Bucket: bucket,
        Key: key,
        UploadId,
        PartNumber: partNumber,
        Body: buffer.slice(0, CHUNK_SIZE),
      }));

      parts.push({ PartNumber: partNumber, ETag });
      buffer = buffer.slice(CHUNK_SIZE);
      partNumber++;
    }
  }

  // Upload remaining data
  if (buffer.length > 0) {
    const { ETag } = await s3.send(new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      UploadId,
      PartNumber: partNumber,
      Body: buffer,
    }));
    parts.push({ PartNumber: partNumber, ETag });
  }

  // Complete multipart upload
  await s3.send(new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId,
    MultipartUpload: { Parts: parts },
  }));
}
```

### 8.4 API Response Optimization

**Compression**:
```typescript
import * as compression from 'compression';
app.use(compression());
```

**Response Pagination & Filtering**:
```typescript
@Get()
async findAll(
  @Query('page') page = 1,
  @Query('limit') limit = 50,
  @Query('sort') sort = '-uploadDate',
  @Query('filter') filter?: string,
) {
  const skip = (page - 1) * limit;

  const query = this.fileModel
    .find(filter ? JSON.parse(filter) : {})
    .skip(skip)
    .limit(limit)
    .sort(sort);

  const [data, total] = await Promise.all([
    query.exec(),
    this.fileModel.countDocuments(filter ? JSON.parse(filter) : {}),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
```

---

## Phase 9: DevOps & Deployment (Weeks 27-28)

### 9.1 Containerization

**Dockerfile** (Multi-stage build):
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/main"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://mongo:27017/velox
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      - mongo
      - redis
    volumes:
      - ./temp:/app/temp

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  mongo-data:
  redis-data:
```

### 9.2 CI/CD Pipeline

**GitHub Actions** (.github/workflows/ci.yml):
```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test:cov
        env:
          MONGODB_URI: mongodb://localhost:27017/velox-test
          REDIS_HOST: localhost
          REDIS_PORT: 6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /app/velox
            docker-compose pull
            docker-compose up -d
            docker system prune -f
```

### 9.3 Monitoring & Logging

**Logging with Winston**:
```typescript
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const app = await NestFactory.create(AppModule, {
  logger: WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context }) => {
            return `${timestamp} [${context}] ${level}: ${message}`;
          }),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.json(),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.json(),
      }),
    ],
  }),
});
```

**Application Metrics with Prometheus**:
```typescript
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
})
export class AppModule {}

// Custom metrics
import { Counter, Histogram } from 'prom-client';

export const fileUploadCounter = new Counter({
  name: 'velox_file_uploads_total',
  help: 'Total number of file uploads',
  labelNames: ['status'],
});

export const fileUploadDuration = new Histogram({
  name: 'velox_file_upload_duration_seconds',
  help: 'File upload duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});
```

**Health Checks**:
```typescript
import { TerminusModule, HealthCheckService, MongooseHealthIndicator, DiskHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ]);
  }
}
```

---

## Phase 10: Migration & Rollout (Weeks 29-32)

### 10.1 Data Migration Strategy

**Step-by-step migration**:

1. **Setup new infrastructure alongside old**
2. **Migrate users incrementally** (canary deployment)
3. **Dual-write period** (write to both old and new systems)
4. **Validate data consistency**
5. **Switch read traffic to new system**
6. **Deprecate old system**

**Migration script example**:
```typescript
// scripts/migrate-users.ts
import { MongoClient } from 'mongodb';
import * as bcrypt from 'bcrypt';

async function migrateUsers() {
  const oldDb = await MongoClient.connect(process.env.OLD_MONGODB_URI);
  const newDb = await MongoClient.connect(process.env.NEW_MONGODB_URI);

  const oldUsers = await oldDb.db().collection('users').find({}).toArray();

  for (const oldUser of oldUsers) {
    // Transform old user schema to new schema
    const newUser = {
      _id: oldUser._id,
      username: oldUser.name,
      displayName: oldUser.username,
      email: oldUser.email,
      password: await bcrypt.hash(oldUser._id, 12), // Temp password
      locale: oldUser.locale || 'en-US',
      quota: {
        total: oldUser.availableSize || 100 * 1024 * 1024 * 1024,
        used: oldUser.size || 0,
      },
      preferences: {
        theme: oldUser.preference?.theme || 'light',
        viewType: oldUser.preference?.viewtype || 'list',
        timezone: oldUser.preference?.timezone || 'UTC',
      },
      notifications: oldUser.notifications || {},
      status: oldUser.status === 1 ? 'active' : 'inactive',
      createdAt: oldUser.createDate,
      updatedAt: new Date(),
    };

    await newDb.db().collection('users').updateOne(
      { _id: newUser._id },
      { $set: newUser },
      { upsert: true }
    );

    console.log(`Migrated user: ${newUser.username}`);
  }

  await oldDb.close();
  await newDb.close();
}
```

### 10.2 Feature Flags

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum Feature {
  NEW_UPLOAD_UI = 'new_upload_ui',
  S3_STORAGE = 's3_storage',
  REALTIME_COLLABORATION = 'realtime_collaboration',
}

@Injectable()
export class FeatureFlagService {
  constructor(private config: ConfigService) {}

  isEnabled(feature: Feature, userId?: string): boolean {
    // Check environment variable
    const envFlag = this.config.get<string>(`FEATURE_${feature.toUpperCase()}`);
    if (envFlag === 'true') return true;
    if (envFlag === 'false') return false;

    // Percentage rollout
    if (userId) {
      const percentage = this.getRolloutPercentage(feature);
      const hash = this.hashUserId(userId);
      return hash < percentage;
    }

    return false;
  }

  private getRolloutPercentage(feature: Feature): number {
    return this.config.get<number>(`FEATURE_${feature.toUpperCase()}_PERCENTAGE`) || 0;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 100;
  }
}

// Usage in controller
@Post('upload')
async upload(@Request() req) {
  if (this.featureFlags.isEnabled(Feature.S3_STORAGE, req.user.id)) {
    return this.newStorageService.upload();
  }
  return this.legacyStorageService.upload();
}
```

### 10.3 Rollback Strategy

**Database migrations with rollback**:
```typescript
// migrations/1234567890-add-quota-field.ts
export class AddQuotaField1234567890 {
  async up(db: Db) {
    await db.collection('users').updateMany(
      {},
      {
        $set: {
          'quota.total': 100 * 1024 * 1024 * 1024,
          'quota.used': 0,
        },
      }
    );
  }

  async down(db: Db) {
    await db.collection('users').updateMany(
      {},
      {
        $unset: {
          quota: '',
        },
      }
    );
  }
}
```

**Blue-Green Deployment**:
```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: velox-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: velox
      version: blue
  template:
    metadata:
      labels:
        app: velox
        version: blue
    spec:
      containers:
      - name: velox
        image: velox:v2.0.0
---
apiVersion: v1
kind: Service
metadata:
  name: velox
spec:
  selector:
    app: velox
    version: blue  # Switch to "green" to rollback
  ports:
  - port: 80
    targetPort: 3000
```

---

## Timeline & Resource Allocation

| Phase | Duration | Team Size | Focus |
|-------|----------|-----------|-------|
| 1. Foundation | 4 weeks | 2-3 developers | Backend infrastructure |
| 2. Storage Layer | 4 weeks | 2 developers | Multi-cloud storage |
| 3. API & Auth | 4 weeks | 2 developers | REST API, JWT |
| 4. WebSocket | 2 weeks | 1 developer | Real-time features |
| 5. Frontend | 6 weeks | 2-3 developers | React rewrite |
| 6. Security | 2 weeks | 1 security engineer | Hardening |
| 7. Testing | 2 weeks | 2 QA engineers | Automated testing |
| 8. Performance | 2 weeks | 1 developer | Optimization |
| 9. DevOps | 2 weeks | 1 DevOps engineer | CI/CD, monitoring |
| 10. Migration | 4 weeks | Full team | Rollout |

**Total Duration**: ~32 weeks (8 months)
**Recommended Team**: 3-4 developers, 1 QA, 1 DevOps

---

## Risk Assessment & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | Critical | Medium | Comprehensive backups, dual-write period, validation |
| Breaking changes in dependencies | High | High | Thorough testing, staged rollout |
| Performance degradation | High | Medium | Load testing, monitoring, rollback plan |
| Security vulnerabilities | Critical | Medium | Security audit, penetration testing |
| User adoption resistance | Medium | Low | Feature flags, gradual rollout, documentation |
| OpenStack Swift deprecation | Medium | Low | Multi-cloud abstraction layer |
| Budget overrun | Medium | Medium | Phased approach, clear milestones |

---

## Success Metrics

- **Performance**: 50% reduction in API response times
- **Security**: Zero critical vulnerabilities in security audit
- **Code Quality**: 80%+ test coverage
- **User Experience**: 90%+ positive feedback on new UI
- **Reliability**: 99.9% uptime
- **Scalability**: Handle 10x current load
- **Developer Productivity**: 40% reduction in development time for new features

---

## Conclusion

This modernization plan provides a comprehensive roadmap to transform Velox from a 14-year-old legacy application into a modern, secure, and scalable enterprise cloud storage platform. The phased approach minimizes risk while delivering incremental value throughout the migration process.

**Key Recommendations**:
1. Start with Phase 1 (Foundation) immediately to address critical security vulnerabilities
2. Implement storage abstraction layer (Phase 2) before migrating significant data
3. Use feature flags extensively to enable gradual rollout
4. Maintain backward compatibility during transition period
5. Invest in comprehensive testing to ensure reliability
6. Document everything for future maintainability

**Next Steps**:
1. Review and approve this plan
2. Assemble the team
3. Set up development environment
4. Begin Phase 1 implementation
