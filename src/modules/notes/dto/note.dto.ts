import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NoteTheme, NoteRotation } from '../schemas/note.schema';

export class NotePositionDto {
  @ApiProperty({ description: 'Top position in pixels', example: 100 })
  @IsNumber()
  @Min(0)
  top: number;

  @ApiProperty({ description: 'Left position in pixels', example: 200 })
  @IsNumber()
  @Min(0)
  left: number;
}

export class CreateNoteDto {
  @ApiProperty({ description: 'Note text content', example: 'Remember to review this file!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;

  @ApiPropertyOptional({ description: 'Note color theme', enum: NoteTheme, example: NoteTheme.YELLOW })
  @IsOptional()
  @IsEnum(NoteTheme)
  theme?: NoteTheme;

  @ApiPropertyOptional({ description: 'Note rotation', enum: ['left', 'right', ''], example: 'left' })
  @IsOptional()
  @IsString()
  rotate?: string;

  @ApiPropertyOptional({ description: 'Note position', type: NotePositionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotePositionDto)
  position?: NotePositionDto;

  @ApiPropertyOptional({ description: 'Associated file IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  files?: string[];
}

export class UpdateNoteDto {
  @ApiPropertyOptional({ description: 'Note text content', example: 'Updated note content' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;

  @ApiPropertyOptional({ description: 'Note color theme', enum: NoteTheme })
  @IsOptional()
  @IsEnum(NoteTheme)
  theme?: NoteTheme;

  @ApiPropertyOptional({ description: 'Note rotation', enum: ['left', 'right', ''] })
  @IsOptional()
  @IsString()
  rotate?: string;

  @ApiPropertyOptional({ description: 'Note position', type: NotePositionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotePositionDto)
  position?: NotePositionDto;

  @ApiPropertyOptional({ description: 'Associated file IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  files?: string[];
}

export class UpdateNotePositionDto {
  @ApiProperty({ description: 'New note position', type: NotePositionDto })
  @ValidateNested()
  @Type(() => NotePositionDto)
  position: NotePositionDto;
}

export class NoteAuthorResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  email?: string;
}

export class NoteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  box: string;

  @ApiProperty({ type: NoteAuthorResponseDto })
  author: NoteAuthorResponseDto;

  @ApiProperty({ type: [String] })
  files: string[];

  @ApiProperty()
  isUnread: boolean;

  @ApiProperty({ enum: NoteTheme })
  theme: NoteTheme;

  @ApiProperty()
  rotate: string;

  @ApiProperty()
  text: string;

  @ApiProperty({ type: NotePositionDto })
  position: NotePositionDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
