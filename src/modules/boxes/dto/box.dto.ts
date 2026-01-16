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
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BoxType, BoxStatus } from '../schemas/box.schema';

export class CreateBoxTagDto {
  @ApiProperty({ description: 'Tag ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Tag name' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ description: 'File count for this tag', default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  count?: number;
}

export class CreateBoxLinkInfoDto {
  @ApiPropertyOptional({ description: 'Subject for sharing link' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({ description: 'Message for sharing link' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;

  @ApiPropertyOptional({ description: 'Whether link sharing is enabled', default: false })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Password protection for link' })
  @IsString()
  @IsOptional()
  @MinLength(4)
  password?: string;

  @ApiPropertyOptional({ description: 'Email recipients for sharing notification' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  recipient?: string[];
}

export class CreateBoxDto {
  @ApiProperty({ description: 'Box name', example: 'My Project' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Box description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Box type: 0=Public R/W, 1=Public W, 2=Public R, 3=Share, 4=Private',
    enum: BoxType,
    default: BoxType.PRIVATE,
  })
  @IsEnum(BoxType)
  @IsOptional()
  type?: BoxType;

  @ApiPropertyOptional({ description: 'Initial member user IDs' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  members?: string[];

  @ApiPropertyOptional({ description: 'Box tags' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBoxTagDto)
  @IsOptional()
  tags?: CreateBoxTagDto[];

  @ApiPropertyOptional({ description: 'Link sharing configuration' })
  @ValidateNested()
  @Type(() => CreateBoxLinkInfoDto)
  @IsOptional()
  linkInfo?: CreateBoxLinkInfoDto;

  @ApiPropertyOptional({ description: 'Storage provider (default: from config)', enum: ['swift', 'aws', 'gcs'] })
  @IsString()
  @IsOptional()
  storageProvider?: string;
}

export class UpdateBoxDto extends PartialType(CreateBoxDto) {
  @ApiPropertyOptional({ description: 'Box status', enum: BoxStatus })
  @IsEnum(BoxStatus)
  @IsOptional()
  status?: BoxStatus;
}

export class AddMembersDto {
  @ApiProperty({ description: 'User IDs or usernames to add as members' })
  @IsArray()
  @IsString({ each: true })
  members: string[];

  @ApiPropertyOptional({ description: 'Subject for invitation email' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({ description: 'Message for invitation email' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;
}

export class RemoveMemberDto {
  @ApiProperty({ description: 'User ID to remove from box' })
  @IsString()
  memberId: string;
}

export class CheckBoxNameDto {
  @ApiProperty({ description: 'Box name to check' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  boxname: string;
}

export class ShareBoxDto {
  @ApiProperty({ description: 'Subject for sharing' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject: string;

  @ApiPropertyOptional({ description: 'Message for sharing' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;

  @ApiPropertyOptional({ description: 'User IDs or usernames to share with' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  to?: string[];

  @ApiPropertyOptional({ description: 'Enable password protection' })
  @IsBoolean()
  @IsOptional()
  passwordEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Password for link sharing' })
  @IsString()
  @IsOptional()
  @MinLength(4)
  password?: string;
}

export class BulkBoxIdsDto {
  @ApiProperty({ description: 'Array of box IDs' })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

export class BoxResponseDto {
  @ApiProperty({ description: 'Box ID' })
  id: string;

  @ApiProperty({ description: 'Box name' })
  name: string;

  @ApiProperty({ description: 'Box description' })
  description?: string;

  @ApiProperty({ description: 'Owner user ID' })
  owner: string;

  @ApiProperty({ description: 'Member user IDs' })
  members: string[];

  @ApiProperty({ description: 'Box type', enum: BoxType })
  type: BoxType;

  @ApiProperty({ description: 'Box status', enum: BoxStatus })
  status: BoxStatus;

  @ApiProperty({ description: 'Total size in bytes' })
  size: number;

  @ApiProperty({ description: 'Human-readable size' })
  sizeFormatted: string;

  @ApiProperty({ description: 'Number of files' })
  fileLength: number;

  @ApiProperty({ description: 'Tags' })
  tags: CreateBoxTagDto[];

  @ApiProperty({ description: 'Link sharing info' })
  linkInfo?: CreateBoxLinkInfoDto;

  @ApiProperty({ description: 'Created date' })
  createDate: Date;

  @ApiProperty({ description: 'Last modified date' })
  lastModifyDate: Date;

  @ApiProperty({ description: 'Is shared with members' })
  isShared: boolean;

  @ApiProperty({ description: 'Is public' })
  isPublic: boolean;
}
