import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  SystemSettings,
  SystemSettingsDocument,
} from './schemas/system-settings.schema';
import {
  UpdateStorageSettingsDto,
  StorageSettingsResponseDto,
} from './dto/storage-settings.dto';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    @InjectModel(SystemSettings.name)
    private settingsModel: Model<SystemSettingsDocument>,
    private configService: ConfigService,
  ) {
    // Use session secret as encryption key (padded/trimmed to 32 bytes)
    const secret =
      configService.get<string>('app.session.secret') || 'default-secret-key';
    this.encryptionKey = crypto.scryptSync(secret, 'salt', 32);
  }

  /**
   * Get system settings
   */
  async getSettings(): Promise<SystemSettings> {
    let settings = await this.settingsModel.findById('default').lean().exec();

    if (!settings) {
      // Create default settings from environment
      const newSettings = await this.createDefaultSettings();
      return newSettings;
    }

    return settings as SystemSettings;
  }

  /**
   * Get storage settings with sensitive data masked
   */
  async getStorageSettings(): Promise<StorageSettingsResponseDto> {
    const settings = await this.getSettings();
    return this.maskSensitiveData(settings.storage);
  }

  /**
   * Update storage settings
   */
  async updateStorageSettings(
    dto: UpdateStorageSettingsDto,
    userId: string,
  ): Promise<StorageSettingsResponseDto> {
    // Encrypt sensitive fields
    const encryptedStorage = this.encryptSensitiveFields(dto);

    const settings = await this.settingsModel
      .findByIdAndUpdate(
        'default',
        {
          $set: {
            storage: encryptedStorage,
            updatedBy: userId,
            updatedAt: new Date(),
          },
        },
        { new: true, upsert: true },
      )
      .lean()
      .exec();

    this.logger.log(`Storage settings updated by user ${userId}`);
    return this.maskSensitiveData(settings.storage);
  }

  /**
   * Test storage connection with provided settings
   */
  async testStorageConnection(
    dto: UpdateStorageSettingsDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      switch (dto.provider) {
        case 'minio':
          return await this.testMinioConnection(dto.minio);
        case 's3':
          return await this.testS3Connection(dto.s3);
        case 'gcs':
          return await this.testGcsConnection(dto.gcs);
        case 'openstack':
          return await this.testOpenstackConnection(dto.openstack);
        default:
          return { success: false, message: 'Unknown provider' };
      }
    } catch (error: any) {
      this.logger.error(`Storage connection test failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get decrypted storage settings (for internal use)
   */
  async getDecryptedStorageSettings(): Promise<UpdateStorageSettingsDto | null> {
    const settings = await this.getSettings();
    if (!settings.storage) return null;

    return this.decryptSensitiveFields(settings.storage);
  }

  // ==================== Private Methods ====================

  private async createDefaultSettings(): Promise<SystemSettings> {
    const defaultSettings = {
      _id: 'default',
      storage: {
        provider:
          this.configService.get<string>('app.storage.provider') || 'minio',
        minio: {
          endpoint:
            this.configService.get<string>('app.storage.minio.endpoint') ||
            'http://minio:9000',
          accessKey:
            this.configService.get<string>('app.storage.minio.accessKey') ||
            'minioadmin',
          secretKey: this.encrypt(
            this.configService.get<string>('app.storage.minio.secretKey') ||
              'minioadmin123',
          ),
          bucket:
            this.configService.get<string>('app.storage.minio.bucket') ||
            'velox',
          useSSL:
            this.configService.get<boolean>('app.storage.minio.useSSL') ||
            false,
          region:
            this.configService.get<string>('app.storage.minio.region') ||
            'us-east-1',
        },
      },
    };

    const settings = await this.settingsModel.create(defaultSettings);
    this.logger.log('Created default system settings');
    return settings.toObject();
  }

  private async testMinioConnection(
    config: UpdateStorageSettingsDto['minio'],
  ): Promise<{ success: boolean; message: string }> {
    if (!config) {
      return { success: false, message: 'MinIO configuration is missing' };
    }

    const client = new S3Client({
      endpoint: config.endpoint,
      region: config.region || 'us-east-1',
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: true,
    });

    await client.send(new ListBucketsCommand({}));
    return { success: true, message: 'Connection successful' };
  }

  private async testS3Connection(
    config: UpdateStorageSettingsDto['s3'],
  ): Promise<{ success: boolean; message: string }> {
    if (!config) {
      return { success: false, message: 'S3 configuration is missing' };
    }

    const client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    await client.send(new ListBucketsCommand({}));
    return { success: true, message: 'Connection successful' };
  }

  private async testGcsConnection(
    config: UpdateStorageSettingsDto['gcs'],
  ): Promise<{ success: boolean; message: string }> {
    if (!config) {
      return { success: false, message: 'GCS configuration is missing' };
    }

    const credentials = JSON.parse(config.credentials);
    const storage = new Storage({
      projectId: config.projectId,
      credentials: credentials,
    });

    await storage.getBuckets();
    return { success: true, message: 'Connection successful' };
  }

  private async testOpenstackConnection(
    config: UpdateStorageSettingsDto['openstack'],
  ): Promise<{ success: boolean; message: string }> {
    if (!config) {
      return { success: false, message: 'OpenStack configuration is missing' };
    }

    // Test OpenStack Swift connection by authenticating with Keystone
    const authPayload = {
      auth: {
        tenantId: config.tenantId,
        passwordCredentials: {
          username: config.username,
          password: config.password,
        },
      },
    };

    const response = await fetch(`${config.authUrl}/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Authentication failed: ${errorText}`);
    }

    return { success: true, message: 'Connection successful' };
  }

  private encryptSensitiveFields(dto: UpdateStorageSettingsDto): any {
    const result: any = { provider: dto.provider };

    if (dto.s3) {
      result.s3 = {
        ...dto.s3,
        secretAccessKey: this.encrypt(dto.s3.secretAccessKey),
      };
    }

    if (dto.gcs) {
      result.gcs = {
        ...dto.gcs,
        credentials: this.encrypt(dto.gcs.credentials),
      };
    }

    if (dto.minio) {
      result.minio = {
        ...dto.minio,
        secretKey: this.encrypt(dto.minio.secretKey),
      };
    }

    if (dto.openstack) {
      result.openstack = {
        ...dto.openstack,
        password: this.encrypt(dto.openstack.password),
      };
    }

    return result;
  }

  private decryptSensitiveFields(storage: any): UpdateStorageSettingsDto {
    const result: UpdateStorageSettingsDto = { provider: storage.provider };

    if (storage.s3) {
      result.s3 = {
        ...storage.s3,
        secretAccessKey: this.decrypt(storage.s3.secretAccessKey),
      };
    }

    if (storage.gcs) {
      result.gcs = {
        ...storage.gcs,
        credentials: this.decrypt(storage.gcs.credentials),
      };
    }

    if (storage.minio) {
      result.minio = {
        ...storage.minio,
        secretKey: this.decrypt(storage.minio.secretKey),
      };
    }

    if (storage.openstack) {
      result.openstack = {
        ...storage.openstack,
        password: this.decrypt(storage.openstack.password),
      };
    }

    return result;
  }

  private maskSensitiveData(storage: any): StorageSettingsResponseDto {
    const result: StorageSettingsResponseDto = { provider: storage?.provider };

    if (storage?.s3) {
      result.s3 = {
        ...storage.s3,
        secretAccessKey: '********',
      };
    }

    if (storage?.gcs) {
      result.gcs = {
        ...storage.gcs,
        credentials: '********',
      };
    }

    if (storage?.minio) {
      result.minio = {
        ...storage.minio,
        secretKey: '********',
      };
    }

    if (storage?.openstack) {
      result.openstack = {
        ...storage.openstack,
        password: '********',
      };
    }

    return result;
  }

  private encrypt(text: string): string {
    if (!text) return text;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    );
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decrypt(text: string): string {
    if (!text || !text.includes(':')) return text;
    try {
      const [ivHex, authTagHex, encrypted] = text.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      // If decryption fails, return original (might be plaintext from migration)
      return text;
    }
  }
}
