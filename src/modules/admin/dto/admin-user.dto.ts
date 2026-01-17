import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  MinLength,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminResetPasswordDto {
  @ApiProperty({
    description: 'New password for the user',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ description: 'User email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Username' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'User status (1 = active, 2 = disabled)',
    enum: [1, 2],
  })
  @IsOptional()
  @IsNumber()
  @IsEnum([1, 2])
  status?: number;

  @ApiPropertyOptional({
    description: 'Storage quota in bytes',
  })
  @IsOptional()
  @IsNumber()
  availableSize?: number;

  @ApiPropertyOptional({
    description: 'User roles',
    example: ['user', 'admin'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
}

export class AdminCreateUserDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Username' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'Password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'User roles',
    default: ['user'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({
    description: 'Storage quota in bytes',
    default: 107374182400, // 100GB
  })
  @IsOptional()
  @IsNumber()
  availableSize?: number;
}

export class AdminUserListQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by status (1 = active, 2 = disabled)',
    enum: [1, 2],
  })
  @IsOptional()
  status?: number;
}
