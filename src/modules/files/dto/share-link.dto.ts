import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDate,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShareLinkDto {
  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Password protection' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Download limit (0 = unlimited)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  downloadLimit?: number;
}

export class AccessShareLinkDto {
  @ApiPropertyOptional({ description: 'Password if link is protected' })
  @IsOptional()
  @IsString()
  password?: string;
}

export class ShareLinkResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  file: string;

  @ApiProperty()
  token: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  createdBy: string;

  @ApiPropertyOptional()
  createdByName?: string;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiProperty()
  hasPassword: boolean;

  @ApiProperty()
  downloadLimit: number;

  @ApiProperty()
  downloadCount: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class PublicFileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  mimetype: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  hasPassword: boolean;
}
