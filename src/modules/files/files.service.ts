import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import * as path from 'path';
import * as mime from 'mime-types';
import { StorageObject, FileDocument, FileStatus, FileType, FileVersion } from './schemas/file.schema';
import { UpdateFileDto, FileSearchDto, CopyFilesDto } from './dto/file.dto';
import { StorageService } from '../storage/storage.service';
import { BoxesService } from '../boxes/boxes.service';
import { UsersService } from '../users/users.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectModel(StorageObject.name) private fileModel: Model<FileDocument>,
    private storageService: StorageService,
    private boxesService: BoxesService,
    private usersService: UsersService,
    private configService: ConfigService,
    private realtimeService: RealtimeService,
  ) {}

  /**
   * Upload a file to a box
   */
  async upload(
    boxId: string,
    fileName: string,
    fileStream: Readable,
    fileSize: number,
    userId: string,
    options?: {
      description?: string;
      tags?: string[];
      isPublic?: boolean;
      mimeType?: string;
    },
  ): Promise<FileDocument> {
    // Get box and check access
    const box = await this.boxesService.findOneByAuth(boxId, userId);

    // Get user info
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check user quota
    const remainingSize = user.availableSize - user.usedSize;
    if (fileSize > remainingSize) {
      throw new BadRequestException('Insufficient storage quota');
    }

    // Determine MIME type
    const mimeType = options?.mimeType || mime.lookup(fileName) || 'application/octet-stream';
    const ext = path.extname(fileName).substring(1).toLowerCase();

    // Generate object key (file ID)
    const fileId = new Types.ObjectId();
    const objectKey = `${fileId.toString()}`;

    // Upload to storage
    try {
      await this.storageService.upload(box.storageContainerName, objectKey, fileStream, {
        contentType: mimeType,
        metadata: {
          originalName: fileName,
          boxId: boxId,
          uploadUser: userId,
          uploadDate: new Date().toISOString(),
        },
      });

      this.logger.log(`Uploaded file to storage: ${objectKey} (${fileSize} bytes)`);
    } catch (error) {
      this.logger.error(`Failed to upload file to storage: ${error.message}`);
      throw new BadRequestException('Failed to upload file to storage');
    }

    // Create file record
    const file = new this.fileModel({
      _id: fileId,
      box: boxId,
      members: box.members,
      container: box.storageContainerName,
      name: fileName,
      ext,
      mime: mimeType,
      size: fileSize,
      description: options?.description,
      tags: options?.tags || [],
      tagsSize: options?.tags?.length || 0,
      status: FileStatus.ACTIVE,
      type: options?.isPublic ? FileType.PUBLIC_INSERT : FileType.MEMBER_INSERT,
      author: userId,
      authorName: user.name || user.email,
      uploadDate: new Date(),
      lastModifyDate: new Date(),
      lastModifyUser: userId,
      lastModifyUsername: user.username || user.email.split('@')[0],
      versions: [],
    });

    await file.save();

    // Update box statistics
    await this.boxesService.updateStats(boxId, fileSize, 1);

    // Update user used size
    await this.usersService.updateUsedSize(userId, fileSize);

    this.logger.log(`File created: ${fileName} (${fileId}) in box ${boxId}`);

    // Broadcast real-time event
    this.realtimeService.broadcastFileUploaded(fileId.toString(), fileName, boxId, userId, user.name || user.email);

    return file;
  }

  /**
   * Upload a new version of an existing file
   */
  async uploadVersion(
    fileId: string,
    fileStream: Readable,
    fileSize: number,
    userId: string,
    description?: string,
  ): Promise<FileDocument> {
    // Get file and check access
    const file = await this.findOneByAuth(fileId, userId);

    // Get user info
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check user quota
    const remainingSize = user.availableSize - user.usedSize;
    if (fileSize > remainingSize) {
      throw new BadRequestException('Insufficient storage quota');
    }

    // Generate new version ID
    const versionId = new Types.ObjectId().toString();
    const objectKey = `${fileId}_v${versionId}`;

    // Upload to storage
    try {
      await this.storageService.upload(file.container, objectKey, fileStream, {
        contentType: file.mime,
        metadata: {
          originalName: file.name,
          fileId: fileId,
          versionId: versionId,
          uploadUser: userId,
          uploadDate: new Date().toISOString(),
        },
      });

      this.logger.log(`Uploaded file version to storage: ${objectKey} (${fileSize} bytes)`);
    } catch (error) {
      this.logger.error(`Failed to upload file version to storage: ${error.message}`);
      throw new BadRequestException('Failed to upload file version to storage');
    }

    // Create version record
    const version: FileVersion = {
      _id: versionId,
      size: fileSize,
      uploadDate: new Date(),
      uploadUser: userId,
      uploadUsername: user.username || user.email.split('@')[0],
      description,
      mime: file.mime,
    };

    // Add version to file
    file.versions.push(version);
    file.size = fileSize; // Update current size
    file.lastModifyDate = new Date();
    file.lastModifyUser = userId;
    file.lastModifyUsername = user.username || user.email.split('@')[0];

    await file.save();

    // Update box statistics (add new size)
    await this.boxesService.updateStats(file.box, fileSize, 0);

    // Update user used size
    await this.usersService.updateUsedSize(userId, fileSize);

    this.logger.log(`File version created: ${file.name} (${versionId})`);

    return file;
  }

  /**
   * Download a file
   */
  async download(fileId: string, userId: string, versionId?: string): Promise<{ stream: Readable; file: FileDocument }> {
    // Get file and check access
    const file = await this.findOneByAuth(fileId, userId);

    // Determine object key
    let objectKey = fileId;
    if (versionId) {
      // Download specific version
      const version = file.versions.find((v) => v._id === versionId);
      if (!version) {
        throw new NotFoundException('Version not found');
      }
      objectKey = `${fileId}_v${versionId}`;
    }

    // Download from storage
    try {
      const stream = await this.storageService.download(file.container, objectKey);
      this.logger.log(`Downloaded file from storage: ${objectKey}`);
      return { stream, file };
    } catch (error) {
      this.logger.error(`Failed to download file from storage: ${error.message}`);
      throw new BadRequestException('Failed to download file from storage');
    }
  }

  /**
   * Find files in a box
   */
  async findByBox(boxId: string, userId: string, includeDeleted = false): Promise<FileDocument[]> {
    // Check box access
    await this.boxesService.findOneByAuth(boxId, userId);

    const query: any = { box: boxId };

    if (!includeDeleted) {
      query.status = FileStatus.ACTIVE;
    }

    return this.fileModel.find(query).sort({ uploadDate: -1 }).exec();
  }

  /**
   * Search files with filters and pagination
   */
  async search(searchDto: FileSearchDto, userId: string): Promise<{ files: FileDocument[]; total: number }> {
    const query: any = {};

    // Filter by box if specified
    if (searchDto.boxId) {
      // Check box access
      await this.boxesService.findOneByAuth(searchDto.boxId, userId);
      query.box = searchDto.boxId;
    } else {
      // Get all boxes user has access to
      const boxes = await this.boxesService.findByUser(userId);
      query.box = { $in: boxes.map((box) => box._id.toString()) };
    }

    // Filter by status
    if (!searchDto.includeDeleted) {
      query.status = FileStatus.ACTIVE;
    }

    // Search by name
    if (searchDto.query) {
      query.name = { $regex: searchDto.query, $options: 'i' };
    }

    // Filter by tags
    if (searchDto.tags && searchDto.tags.length > 0) {
      query.tags = { $in: searchDto.tags };
    }

    // Filter by MIME type
    if (searchDto.mimeType) {
      query.mime = { $regex: searchDto.mimeType, $options: 'i' };
    }

    // Filter by author
    if (searchDto.author) {
      query.author = searchDto.author;
    }

    // Sort
    const sortField = searchDto.sortBy || 'uploadDate';
    const sortOrder = searchDto.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    // Pagination
    const page = searchDto.page || 1;
    const limit = searchDto.limit || 50;
    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      this.fileModel.find(query).sort(sort).skip(skip).limit(limit).exec(),
      this.fileModel.countDocuments(query).exec(),
    ]);

    return { files, total };
  }

  /**
   * Find one file by ID with authorization check
   */
  async findOneByAuth(fileId: string, userId: string): Promise<FileDocument> {
    const file = await this.fileModel.findById(fileId).exec();

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check if user has access (owner, member, or box access)
    if (file.author !== userId && !file.members.includes(userId)) {
      // Check box access
      try {
        await this.boxesService.findOneByAuth(file.box, userId);
      } catch {
        throw new ForbiddenException('You do not have access to this file');
      }
    }

    return file;
  }

  /**
   * Find file by ID (no auth check - for internal use)
   */
  async findById(fileId: string): Promise<FileDocument> {
    const file = await this.fileModel.findById(fileId).exec();

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  /**
   * Check if filenames exist in a box
   */
  async checkFilenames(boxId: string, filenames: string[], userId: string): Promise<FileDocument[]> {
    // Check box access
    await this.boxesService.findOneByAuth(boxId, userId);

    return this.fileModel.find({
      box: boxId,
      name: { $in: filenames },
      status: FileStatus.ACTIVE,
    }).exec();
  }

  /**
   * Update file metadata
   */
  async update(fileId: string, updateDto: UpdateFileDto, userId: string): Promise<FileDocument> {
    const file = await this.findOneByAuth(fileId, userId);

    // Update fields
    if (updateDto.name !== undefined) file.name = updateDto.name;
    if (updateDto.description !== undefined) file.description = updateDto.description;
    if (updateDto.tags !== undefined) {
      file.tags = updateDto.tags;
      file.tagsSize = updateDto.tags.length;
    }
    if (updateDto.status !== undefined) file.status = updateDto.status;

    file.lastModifyDate = new Date();
    file.lastModifyUser = userId;

    await file.save();

    this.logger.log(`File updated: ${file.name} (${fileId})`);
    return file;
  }

  /**
   * Soft delete a file
   */
  async delete(fileId: string, userId: string): Promise<FileDocument> {
    const file = await this.findOneByAuth(fileId, userId);

    file.status = FileStatus.DELETED;
    file.lastModifyDate = new Date();
    file.lastModifyUser = userId;

    await file.save();

    this.logger.log(`File deleted: ${file.name} (${fileId})`);
    return file;
  }

  /**
   * Restore a deleted file
   */
  async restore(fileId: string, userId: string): Promise<FileDocument> {
    const file = await this.findOneByAuth(fileId, userId);

    file.status = FileStatus.ACTIVE;
    file.lastModifyDate = new Date();
    file.lastModifyUser = userId;

    await file.save();

    this.logger.log(`File restored: ${file.name} (${fileId})`);
    return file;
  }

  /**
   * Permanently delete a file and its storage objects
   */
  async permanentDelete(fileId: string, userId: string): Promise<void> {
    const file = await this.findOneByAuth(fileId, userId);

    // Delete main file from storage
    try {
      await this.storageService.delete(file.container, fileId);
      this.logger.log(`Deleted file from storage: ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from storage: ${error.message}`);
    }

    // Delete versions from storage
    for (const version of file.versions) {
      try {
        const versionKey = `${fileId}_v${version._id}`;
        await this.storageService.delete(file.container, versionKey);
        this.logger.log(`Deleted version from storage: ${versionKey}`);
      } catch (error) {
        this.logger.error(`Failed to delete version from storage: ${error.message}`);
      }
    }

    // Calculate total size to free
    const totalSize = file.size + file.versions.reduce((sum, v) => sum + v.size, 0);

    // Update box statistics
    await this.boxesService.updateStats(file.box, -totalSize, -1);

    // Update user used size
    await this.usersService.updateUsedSize(file.author, -totalSize);

    // Delete file record
    await this.fileModel.deleteOne({ _id: fileId }).exec();

    this.logger.log(`File permanently deleted: ${file.name} (${fileId})`);
  }

  /**
   * Copy files to another box
   */
  async copyFiles(copyDto: CopyFilesDto, userId: string): Promise<FileDocument[]> {
    const copiedFiles: FileDocument[] = [];

    // Check destination box access
    const destBox = await this.boxesService.findOneByAuth(copyDto.destBoxId, userId);

    for (const fileId of copyDto.fileIds) {
      const sourceFile = await this.findOneByAuth(fileId, userId);

      if (copyDto.how === 'newitem') {
        // Copy as new file
        const { stream } = await this.download(fileId, userId);

        const newFile = await this.upload(
          copyDto.destBoxId,
          sourceFile.name,
          stream,
          sourceFile.size,
          userId,
          {
            description: sourceFile.description,
            tags: sourceFile.tags,
            mimeType: sourceFile.mime,
          },
        );

        copiedFiles.push(newFile);
      } else if (copyDto.how === 'version') {
        // Copy as new version of existing file
        // Find file with same name in destination box
        const [existingFile] = await this.checkFilenames(copyDto.destBoxId, [sourceFile.name], userId);

        if (existingFile) {
          const { stream } = await this.download(fileId, userId);

          const updatedFile = await this.uploadVersion(
            existingFile._id.toString(),
            stream,
            sourceFile.size,
            userId,
            `Copied from ${sourceFile.box}`,
          );

          copiedFiles.push(updatedFile);
        } else {
          throw new NotFoundException(`File with name "${sourceFile.name}" not found in destination box`);
        }
      }
    }

    this.logger.log(`Copied ${copiedFiles.length} files to box ${copyDto.destBoxId}`);
    return copiedFiles;
  }

  /**
   * Bulk delete files
   */
  async bulkDelete(fileIds: string[], userId: string): Promise<number> {
    let count = 0;

    for (const fileId of fileIds) {
      try {
        await this.delete(fileId, userId);
        count++;
      } catch (error) {
        this.logger.error(`Failed to delete file ${fileId}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk deleted ${count} files by user ${userId}`);
    return count;
  }

  /**
   * Bulk restore files
   */
  async bulkRestore(fileIds: string[], userId: string): Promise<number> {
    let count = 0;

    for (const fileId of fileIds) {
      try {
        await this.restore(fileId, userId);
        count++;
      } catch (error) {
        this.logger.error(`Failed to restore file ${fileId}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk restored ${count} files by user ${userId}`);
    return count;
  }
}
