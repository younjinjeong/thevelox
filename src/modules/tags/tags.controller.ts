import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto, BulkTagDto, TagResponseDto } from './dto/tag.dto';

@ApiTags('Tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get('box/:boxId')
  @ApiOperation({ summary: 'Get all tags in a box' })
  @ApiResponse({ status: 200, description: 'Returns all tags in the box', type: [TagResponseDto] })
  async findAllByBox(
    @Param('boxId') boxId: string,
    @Request() req,
  ): Promise<TagResponseDto[]> {
    return this.tagsService.findAllByBox(boxId, req.user.userId);
  }

  @Post('box/:boxId')
  @ApiOperation({ summary: 'Create a new tag in a box' })
  @ApiResponse({ status: 201, description: 'Tag created successfully', type: TagResponseDto })
  async create(
    @Param('boxId') boxId: string,
    @Body() createTagDto: CreateTagDto,
    @Request() req,
  ): Promise<TagResponseDto> {
    return this.tagsService.create(
      boxId,
      createTagDto,
      req.user.userId,
      req.user.name,
    );
  }

  @Get(':tagId')
  @ApiOperation({ summary: 'Get a tag by ID' })
  @ApiResponse({ status: 200, description: 'Returns the tag', type: TagResponseDto })
  async findById(
    @Param('tagId') tagId: string,
    @Request() req,
  ): Promise<TagResponseDto> {
    return this.tagsService.findById(tagId, req.user.userId);
  }

  @Put(':tagId')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiResponse({ status: 200, description: 'Tag updated successfully', type: TagResponseDto })
  async update(
    @Param('tagId') tagId: string,
    @Body() updateTagDto: UpdateTagDto,
    @Request() req,
  ): Promise<TagResponseDto> {
    return this.tagsService.update(tagId, updateTagDto, req.user.userId);
  }

  @Delete(':tagId')
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiResponse({ status: 200, description: 'Tag deleted successfully' })
  async delete(
    @Param('tagId') tagId: string,
    @Request() req,
  ): Promise<void> {
    return this.tagsService.delete(tagId, req.user.userId);
  }

  @Post('bulk-add')
  @ApiOperation({ summary: 'Add a tag to multiple files' })
  @ApiResponse({ status: 200, description: 'Files updated successfully' })
  async bulkAdd(
    @Body() bulkTagDto: BulkTagDto,
    @Request() req,
  ): Promise<{ updated: number }> {
    return this.tagsService.addTagToFiles(
      bulkTagDto.tagId,
      bulkTagDto.fileIds,
      req.user.userId,
    );
  }

  @Post('bulk-remove')
  @ApiOperation({ summary: 'Remove a tag from multiple files' })
  @ApiResponse({ status: 200, description: 'Files updated successfully' })
  async bulkRemove(
    @Body() bulkTagDto: BulkTagDto,
    @Request() req,
  ): Promise<{ updated: number }> {
    return this.tagsService.removeTagFromFiles(
      bulkTagDto.tagId,
      bulkTagDto.fileIds,
      req.user.userId,
    );
  }
}
