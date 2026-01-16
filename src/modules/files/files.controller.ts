import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { Readable } from 'stream';
import { FilesService } from './files.service';
import {
  UploadFileDto,
  UpdateFileDto,
  UploadVersionDto,
  CopyFilesDto,
  BulkFileIdsDto,
  FileSearchDto,
  CheckFilenamesDto,
  FileResponseDto,
  FileListResponseDto,
  FileUploadResponseDto,
} from './dto/file.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to a box' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        boxId: { type: 'string' },
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        isPublic: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully', type: FileUploadResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
    @Request() req,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      return { success: false, message: 'No file provided' };
    }

    try {
      // Convert buffer to stream
      const stream = Readable.from(file.buffer);

      const uploadedFile = await this.filesService.upload(
        uploadDto.boxId,
        file.originalname,
        stream,
        file.size,
        req.user.userId,
        {
          description: uploadDto.description,
          tags: uploadDto.tags,
          isPublic: uploadDto.isPublic,
          mimeType: file.mimetype,
        },
      );

      return {
        success: true,
        file: this.mapToResponseDto(uploadedFile),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post(':id/version')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a new version of an existing file' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        description: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Version uploaded successfully', type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  async uploadVersion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description: string,
    @Request() req,
  ): Promise<FileResponseDto> {
    if (!file) {
      throw new Error('No file provided');
    }

    const stream = Readable.from(file.buffer);

    const updatedFile = await this.filesService.uploadVersion(id, stream, file.size, req.user.userId, description);

    return this.mapToResponseDto(updatedFile);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search files with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully', type: FileListResponseDto })
  async search(@Query() searchDto: FileSearchDto, @Request() req): Promise<FileListResponseDto> {
    const { files, total } = await this.filesService.search(searchDto, req.user.userId);

    const page = searchDto.page || 1;
    const limit = searchDto.limit || 50;
    const totalPages = Math.ceil(total / limit);

    return {
      files: files.map((file) => this.mapToResponseDto(file)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  @Get('box/:boxId')
  @ApiOperation({ summary: 'Get all files in a box' })
  @ApiParam({ name: 'boxId', description: 'Box ID' })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean, description: 'Include deleted files' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully', type: [FileResponseDto] })
  async findByBox(
    @Param('boxId') boxId: string,
    @Query('includeDeleted') includeDeleted: boolean,
    @Request() req,
  ): Promise<FileResponseDto[]> {
    const files = await this.filesService.findByBox(boxId, req.user.userId, includeDeleted);
    return files.map((file) => this.mapToResponseDto(file));
  }

  @Post('check-filenames')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if filenames exist in a box' })
  @ApiResponse({ status: 200, description: 'Filenames checked', type: [FileResponseDto] })
  async checkFilenames(@Body() dto: CheckFilenamesDto, @Request() req): Promise<FileResponseDto[]> {
    const filenames = dto.filenames.split(',').map((f) => f.trim());
    const files = await this.filesService.checkFilenames(dto.boxId, filenames, req.user.userId);
    return files.map((file) => this.mapToResponseDto(file));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file details by ID' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully', type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Param('id') id: string, @Request() req): Promise<FileResponseDto> {
    const file = await this.filesService.findOneByAuth(id, req.user.userId);
    return this.mapToResponseDto(file);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a file' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiQuery({ name: 'versionId', required: false, description: 'Specific version ID to download' })
  @ApiResponse({ status: 200, description: 'File download stream' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async download(
    @Param('id') id: string,
    @Query('versionId') versionId: string,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, file } = await this.filesService.download(id, req.user.userId, versionId);

    // Set response headers
    res.set({
      'Content-Type': file.mime || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
      'Cache-Control': 'no-cache',
    });

    return new StreamableFile(stream);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update file metadata' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File updated successfully', type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateFileDto, @Request() req): Promise<FileResponseDto> {
    const file = await this.filesService.update(id, updateDto, req.user.userId);
    return this.mapToResponseDto(file);
  }

  @Post('copy')
  @ApiOperation({ summary: 'Copy files to another box' })
  @ApiResponse({ status: 200, description: 'Files copied successfully', type: [FileResponseDto] })
  async copy(@Body() copyDto: CopyFilesDto, @Request() req): Promise<FileResponseDto[]> {
    const files = await this.filesService.copyFiles(copyDto, req.user.userId);
    return files.map((file) => this.mapToResponseDto(file));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a file' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File deleted successfully', type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  async delete(@Param('id') id: string, @Request() req): Promise<FileResponseDto> {
    const file = await this.filesService.delete(id, req.user.userId);
    return this.mapToResponseDto(file);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a deleted file' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File restored successfully', type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  async restore(@Param('id') id: string, @Request() req): Promise<FileResponseDto> {
    const file = await this.filesService.restore(id, req.user.userId);
    return this.mapToResponseDto(file);
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a file and its storage' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 204, description: 'File permanently deleted' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async permanentDelete(@Param('id') id: string, @Request() req): Promise<void> {
    await this.filesService.permanentDelete(id, req.user.userId);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete multiple files' })
  @ApiResponse({ status: 200, description: 'Files deleted successfully', schema: { properties: { count: { type: 'number' } } } })
  async bulkDelete(@Body() dto: BulkFileIdsDto, @Request() req) {
    const count = await this.filesService.bulkDelete(dto.ids, req.user.userId);
    return { count, message: `${count} files deleted successfully` };
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore multiple deleted files' })
  @ApiResponse({ status: 200, description: 'Files restored successfully', schema: { properties: { count: { type: 'number' } } } })
  async bulkRestore(@Body() dto: BulkFileIdsDto, @Request() req) {
    const count = await this.filesService.bulkRestore(dto.ids, req.user.userId);
    return { count, message: `${count} files restored successfully` };
  }

  // ============================================
  // Helper methods
  // ============================================

  private mapToResponseDto(file: any): FileResponseDto {
    return {
      id: file._id.toString(),
      box: file.box,
      members: file.members,
      container: file.container,
      name: file.name,
      ext: file.ext,
      mime: file.mime,
      size: file.size,
      sizeFormatted: file.sizeFormatted,
      description: file.description,
      tags: file.tags,
      status: file.status,
      type: file.type,
      author: file.author,
      authorName: file.authorName,
      lastModifyUser: file.lastModifyUser,
      lastModifyUsername: file.lastModifyUsername,
      uploadDate: file.uploadDate,
      lastModifyDate: file.lastModifyDate,
      isSended: file.isSended,
      isReceived: file.isReceived,
      images: file.images,
      public: file.public,
      versions: file.versions,
      hasVersions: file.hasVersions,
      versionCount: file.versionCount,
      isImage: file.isImage,
      isDocument: file.isDocument,
      link: file.link,
    };
  }
}
