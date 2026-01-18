import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SystemSettingsDocument = SystemSettings & Document;

// Storage provider sub-schemas
@Schema({ _id: false })
export class S3Settings {
  @Prop()
  accessKeyId: string;

  @Prop()
  secretAccessKey: string;

  @Prop({ default: 'us-east-1' })
  region: string;

  @Prop()
  bucket: string;
}

@Schema({ _id: false })
export class GcsSettings {
  @Prop()
  projectId: string;

  @Prop()
  credentials: string; // JSON string or base64 encoded key file

  @Prop()
  bucket: string;
}

@Schema({ _id: false })
export class MinioSettings {
  @Prop()
  endpoint: string;

  @Prop()
  accessKey: string;

  @Prop()
  secretKey: string;

  @Prop()
  bucket: string;

  @Prop({ default: false })
  useSSL: boolean;

  @Prop({ default: 'us-east-1' })
  region: string;
}

@Schema({ _id: false })
export class OpenstackSettings {
  @Prop()
  authUrl: string;

  @Prop()
  tenantId: string;

  @Prop()
  username: string;

  @Prop()
  password: string;

  @Prop()
  container: string;
}

@Schema({ _id: false })
export class StorageConfig {
  @Prop({
    type: String,
    enum: ['s3', 'gcs', 'minio', 'openstack'],
    default: 'minio',
  })
  provider: string;

  @Prop({ type: S3Settings })
  s3?: S3Settings;

  @Prop({ type: GcsSettings })
  gcs?: GcsSettings;

  @Prop({ type: MinioSettings })
  minio?: MinioSettings;

  @Prop({ type: OpenstackSettings })
  openstack?: OpenstackSettings;
}

/**
 * System Settings Schema
 * Uses a singleton pattern with _id = 'default'
 */
@Schema({
  collection: 'system_settings',
  timestamps: true,
})
export class SystemSettings {
  @Prop({ type: String, default: 'default' })
  _id: string;

  @Prop({ type: StorageConfig })
  storage: StorageConfig;

  @Prop({ type: Date })
  updatedAt: Date;

  @Prop({ type: String })
  updatedBy: string;
}

export const SystemSettingsSchema =
  SchemaFactory.createForClass(SystemSettings);
