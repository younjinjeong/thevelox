import { IsString, IsOptional, IsEmail, IsNumber, IsBoolean, IsEnum, MinLength } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'User locale' })
  @IsOptional()
  @IsString()
  @IsEnum(['en-US', 'ko-KR', 'ja-JP'])
  locale?: string;

  @ApiPropertyOptional({ description: 'Storage quota in bytes' })
  @IsOptional()
  @IsNumber()
  availableSize?: number;

  @ApiPropertyOptional({ description: 'User status (1: active, 2: inactive)' })
  @IsOptional()
  @IsNumber()
  @IsEnum([1, 2])
  status?: number;
}

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({ description: 'UI theme', enum: ['light', 'dark'] })
  @IsOptional()
  @IsEnum(['light', 'dark'])
  theme?: string;

  @ApiPropertyOptional({ description: 'View type', enum: ['list', 'grid'] })
  @IsOptional()
  @IsEnum(['list', 'grid'])
  viewtype?: string;

  @ApiPropertyOptional({ description: 'Conflict resolution', enum: ['ask', 'replace', 'version'] })
  @IsOptional()
  @IsEnum(['ask', 'replace', 'version'])
  conflict?: string;

  @ApiPropertyOptional({ description: 'Display name preference', enum: ['username', 'email'] })
  @IsOptional()
  @IsEnum(['username', 'email'])
  dispname?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UpdateUserNotificationsDto {
  @ApiPropertyOptional({ description: 'File received notifications' })
  @IsOptional()
  @IsBoolean()
  received?: boolean;

  @ApiPropertyOptional({ description: 'File sent notifications' })
  @IsOptional()
  @IsBoolean()
  sent?: boolean;

  @ApiPropertyOptional({ description: 'Note notifications' })
  @IsOptional()
  @IsBoolean()
  note?: boolean;

  @ApiPropertyOptional({ description: 'Storage quota warning' })
  @IsOptional()
  @IsBoolean()
  nospace?: boolean;

  @ApiPropertyOptional({ description: 'Box invitation notifications' })
  @IsOptional()
  @IsBoolean()
  invited?: boolean;

  @ApiPropertyOptional({ description: 'Link expiration notifications' })
  @IsOptional()
  @IsBoolean()
  expired?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
