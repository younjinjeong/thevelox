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
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
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

// Multer configuration for large file uploads (500MB limit)
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB in bytes
const UPLOAD_TEMP_DIR = path.join(os.tmpdir(), 'velox-uploads');

// Ensure temp directory exists
if (!fs.existsSync(UPLOAD_TEMP_DIR)) {
  fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
}

const multerConfig = {
  storage: diskStorage({
    destination: UPLOAD_TEMP_DIR,
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `upload-${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to a box (max 500MB)' })
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
  @ApiResponse({ status: 413, description: 'File too large (max 500MB)' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
    @Request() req,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      return { success: false, message: 'No file provided' };
    }

    try {
      // Create read stream from disk-stored file
      const stream = fs.createReadStream(file.path);

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

      // Clean up temp file after upload
      fs.unlink(file.path, (err) => {
        if (err) console.error('Failed to delete temp file:', err);
      });

      return {
        success: true,
        file: this.mapToResponseDto(uploadedFile),
      };
    } catch (error: any) {
      // Clean up temp file on error
      if (file.path) {
        fs.unlink(file.path, () => {});
      }
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post(':id/version')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a new version of an existing file (max 500MB)' })
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
  @ApiResponse({ status: 413, description: 'File too large (max 500MB)' })
  async uploadVersion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description: string,
    @Request() req,
  ): Promise<FileResponseDto> {
    if (!file) {
      throw new Error('No file provided');
    }

    try {
      // Create read stream from disk-stored file
      const stream = fs.createReadStream(file.path);

      const updatedFile = await this.filesService.uploadVersion(id, stream, file.size, req.user.userId, description);

      // Clean up temp file after upload
      fs.unlink(file.path, (err) => {
        if (err) console.error('Failed to delete temp file:', err);
      });

      return this.mapToResponseDto(updatedFile);
    } catch (error: any) {
      // Clean up temp file on error
      if (file.path) {
        fs.unlink(file.path, () => {});
      }
      throw error;
    }
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

  @Get('starred')
  @ApiOperation({ summary: 'Get starred files for current user' })
  @ApiResponse({ status: 200, description: 'Starred files retrieved successfully', type: [FileResponseDto] })
  async findStarred(@Request() req): Promise<FileResponseDto[]> {
    const files = await this.filesService.findStarred(req.user.userId);
    return files.map((file) => this.mapToResponseDto(file));
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent files for current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of files to return (default: 20)' })
  @ApiResponse({ status: 200, description: 'Recent files retrieved successfully', type: [FileResponseDto] })
  async findRecent(@Request() req, @Query('limit') limit?: number): Promise<FileResponseDto[]> {
    const files = await this.filesService.findRecent(req.user.userId, limit || 20);
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

  @Post(':id/star')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle star status for a file' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'Star status toggled successfully', type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  async toggleStar(@Param('id') id: string, @Request() req): Promise<FileResponseDto> {
    const file = await this.filesService.toggleStar(id, req.user.userId);
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
      starred: file.starred || false,
    };
  }
}
