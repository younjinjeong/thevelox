import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class S3SettingsDto {
  @ApiProperty({ description: 'AWS Access Key ID' })
  @IsString()
  @MinLength(1)
  accessKeyId: string;

  @ApiProperty({ description: 'AWS Secret Access Key' })
  @IsString()
  @MinLength(1)
  secretAccessKey: string;

  @ApiProperty({ description: 'AWS Region', default: 'us-east-1' })
  @IsString()
  region: string;

  @ApiProperty({ description: 'S3 Bucket Name' })
  @IsString()
  @MinLength(1)
  bucket: string;
}

export class GcsSettingsDto {
  @ApiProperty({ description: 'Google Cloud Project ID' })
  @IsString()
  @MinLength(1)
  projectId: string;

  @ApiProperty({ description: 'Service Account JSON credentials (as string)' })
  @IsString()
  @MinLength(1)
  credentials: string;

  @ApiProperty({ description: 'GCS Bucket Name' })
  @IsString()
  @MinLength(1)
  bucket: string;
}

export class MinioSettingsDto {
  @ApiProperty({
    description: 'MinIO Server Endpoint',
    example: 'http://minio:9000',
  })
  @IsString()
  @MinLength(1)
  endpoint: string;

  @ApiProperty({ description: 'MinIO Access Key' })
  @IsString()
  @MinLength(1)
  accessKey: string;

  @ApiProperty({ description: 'MinIO Secret Key' })
  @IsString()
  @MinLength(1)
  secretKey: string;

  @ApiProperty({ description: 'MinIO Bucket Name' })
  @IsString()
  @MinLength(1)
  bucket: string;

  @ApiProperty({ description: 'Use SSL/TLS', default: false })
  @IsBoolean()
  useSSL: boolean;

  @ApiPropertyOptional({
    description: 'Region (for S3 SDK compatibility)',
    default: 'us-east-1',
  })
  @IsOptional()
  @IsString()
  region?: string;
}

export class SwiftSettingsDto {
  @ApiProperty({
    description: 'OpenStack Keystone Auth URL',
    example: 'http://keystone:5000/v2.0',
  })
  @IsString()
  @MinLength(1)
  authUrl: string;

  @ApiProperty({ description: 'OpenStack Tenant ID' })
  @IsString()
  @MinLength(1)
  tenantId: string;

  @ApiProperty({ description: 'OpenStack Username' })
  @IsString()
  @MinLength(1)
  username: string;

  @ApiProperty({ description: 'OpenStack Password' })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiProperty({ description: 'Swift Container Name' })
  @IsString()
  @MinLength(1)
  container: string;
}

export class UpdateStorageSettingsDto {
  @ApiProperty({
    enum: ['s3', 'gcs', 'minio', 'openstack'],
    description: 'Storage provider type',
  })
  @IsEnum(['s3', 'gcs', 'minio', 'openstack'])
  provider: 's3' | 'gcs' | 'minio' | 'openstack';

  @ApiPropertyOptional({ description: 'AWS S3 configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => S3SettingsDto)
  s3?: S3SettingsDto;

  @ApiPropertyOptional({ description: 'Google Cloud Storage configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GcsSettingsDto)
  gcs?: GcsSettingsDto;

  @ApiPropertyOptional({ description: 'MinIO configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MinioSettingsDto)
  minio?: MinioSettingsDto;

  @ApiPropertyOptional({ description: 'OpenStack Swift configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SwiftSettingsDto)
  openstack?: SwiftSettingsDto;
}

export class TestStorageConnectionDto extends UpdateStorageSettingsDto {}

export class StorageSettingsResponseDto {
  @ApiProperty({ description: 'Active storage provider' })
  provider: string;

  @ApiPropertyOptional({ description: 'S3 settings (secrets masked)' })
  s3?: {
    accessKeyId: string;
    secretAccessKey: string; // Masked
    region: string;
    bucket: string;
  };

  @ApiPropertyOptional({ description: 'GCS settings (secrets masked)' })
  gcs?: {
    projectId: string;
    credentials: string; // Masked
    bucket: string;
  };

  @ApiPropertyOptional({ description: 'MinIO settings (secrets masked)' })
  minio?: {
    endpoint: string;
    accessKey: string;
    secretKey: string; // Masked
    bucket: string;
    useSSL: boolean;
  };

  @ApiPropertyOptional({ description: 'OpenStack Swift settings (secrets masked)' })
  openstack?: {
    authUrl: string;
    tenantId: string;
    username: string;
    password: string; // Masked
    container?: string;
  };
}
