import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { FileStatus, FileType } from '../schemas/file.schema';

export class UploadFileDto {
  @ApiProperty({ description: 'Box ID where file will be uploaded' })
  @IsString()
  boxId: string;

  @ApiPropertyOptional({ description: 'File description' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Tags for the file' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Upload as public file', default: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class UpdateFileDto {
  @ApiPropertyOptional({ description: 'File name' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'File description' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Tags for the file' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'File status', enum: FileStatus })
  @IsEnum(FileStatus)
  @IsOptional()
  status?: FileStatus;
}

export class UploadVersionDto {
  @ApiProperty({ description: 'File ID to create new version for' })
  @IsString()
  fileId: string;

  @ApiPropertyOptional({ description: 'Version description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class CopyFilesDto {
  @ApiProperty({ description: 'File IDs to copy' })
  @IsArray()
  @IsString({ each: true })
  fileIds: string[];

  @ApiProperty({ description: 'Destination box ID' })
  @IsString()
  destBoxId: string;

  @ApiProperty({ description: 'Copy method: newitem or version', enum: ['newitem', 'version'] })
  @IsEnum(['newitem', 'version'])
  how: 'newitem' | 'version';
}

export class BulkFileIdsDto {
  @ApiProperty({ description: 'Array of file IDs' })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

export class FileSearchDto {
  @ApiPropertyOptional({ description: 'Search query for file name' })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiPropertyOptional({ description: 'Filter by box ID' })
  @IsString()
  @IsOptional()
  boxId?: string;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter by MIME type' })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Filter by author user ID' })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiPropertyOptional({ description: 'Include deleted files', default: false })
  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ description: 'Sort by field', enum: ['uploadDate', 'name', 'size'] })
  @IsString()
  @IsOptional()
  sortBy?: 'uploadDate' | 'name' | 'size';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}

export class CreatePublicLinkDto {
  @ApiPropertyOptional({ description: 'Link expiration date' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Password protect the link' })
  @IsString()
  @IsOptional()
  @MinLength(4)
  password?: string;
}

export class CheckFilenamesDto {
  @ApiProperty({ description: 'Comma-separated list of filenames to check' })
  @IsString()
  filenames: string;

  @ApiProperty({ description: 'Box ID to check in' })
  @IsString()
  boxId: string;
}

export class FileVersionResponseDto {
  @ApiProperty({ description: 'Version ID' })
  _id: string;

  @ApiProperty({ description: 'Version size in bytes' })
  size: number;

  @ApiProperty({ description: 'Upload date' })
  uploadDate: Date;

  @ApiProperty({ description: 'Uploader user ID' })
  uploadUser: string;

  @ApiProperty({ description: 'Uploader username' })
  uploadUsername?: string;

  @ApiProperty({ description: 'Version description' })
  description?: string;

  @ApiProperty({ description: 'MIME type' })
  mime?: string;
}

export class FileResponseDto {
  @ApiProperty({ description: 'File ID' })
  id: string;

  @ApiProperty({ description: 'Box ID' })
  box: string;

  @ApiProperty({ description: 'Member user IDs' })
  members: string[];

  @ApiProperty({ description: 'Storage container name' })
  container: string;

  @ApiProperty({ description: 'File name' })
  name: string;

  @ApiProperty({ description: 'File extension' })
  ext?: string;

  @ApiProperty({ description: 'MIME type' })
  mime?: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'Human-readable file size' })
  sizeFormatted: string;

  @ApiProperty({ description: 'File description' })
  description?: string;

  @ApiProperty({ description: 'Tags' })
  tags: string[];

  @ApiProperty({ description: 'File status', enum: FileStatus })
  status: FileStatus;

  @ApiProperty({ description: 'File type', enum: FileType })
  type: FileType;

  @ApiProperty({ description: 'Author user ID' })
  author: string;

  @ApiProperty({ description: 'Author name' })
  authorName?: string;

  @ApiProperty({ description: 'Last modify user ID' })
  lastModifyUser?: string;

  @ApiProperty({ description: 'Last modify username' })
  lastModifyUsername?: string;

  @ApiProperty({ description: 'Upload date' })
  uploadDate: Date;

  @ApiProperty({ description: 'Last modify date' })
  lastModifyDate: Date;

  @ApiProperty({ description: 'Is file sent' })
  isSended: boolean;

  @ApiProperty({ description: 'Is file received' })
  isReceived: boolean;

  @ApiProperty({ description: 'Image metadata' })
  images?: any;

  @ApiProperty({ description: 'Public link info' })
  public?: any;

  @ApiProperty({ description: 'Versions', type: [FileVersionResponseDto] })
  versions: FileVersionResponseDto[];

  @ApiProperty({ description: 'Has versions' })
  hasVersions: boolean;

  @ApiProperty({ description: 'Version count' })
  versionCount: number;

  @ApiProperty({ description: 'Is image file' })
  isImage: boolean;

  @ApiProperty({ description: 'Is document file' })
  isDocument: boolean;

  @ApiProperty({ description: 'Download link' })
  link?: string;
}

export class FileListResponseDto {
  @ApiProperty({ description: 'Files', type: [FileResponseDto] })
  files: FileResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;
}

export class FileUploadResponseDto {
  @ApiProperty({ description: 'Upload successful' })
  success: boolean;

  @ApiProperty({ description: 'File info', type: FileResponseDto })
  file?: FileResponseDto;

  @ApiProperty({ description: 'Error message if upload failed' })
  message?: string;
}
