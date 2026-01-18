import { IsString, IsNotEmpty, IsOptional, IsHexColor, IsArray, IsMongoId, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ description: 'Tag name', example: 'Important' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ description: 'Hex color for the tag', example: '#3B82F6' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  color?: string;
}

export class UpdateTagDto {
  @ApiPropertyOptional({ description: 'Tag name', example: 'Very Important' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: 'Hex color for the tag', example: '#EF4444' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  color?: string;
}

export class BulkTagDto {
  @ApiProperty({ description: 'Tag ID to apply/remove' })
  @IsString()
  @IsNotEmpty()
  tagId: string;

  @ApiProperty({ description: 'Array of file IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  fileIds: string[];
}

export class TagResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  color: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  createdBy: string;

  @ApiPropertyOptional()
  createdByName?: string;

  @ApiProperty()
  createdAt: Date;
}
