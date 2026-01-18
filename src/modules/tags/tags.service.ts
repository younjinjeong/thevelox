import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tag, TagDocument } from './schemas/tag.schema';
import { CreateTagDto, UpdateTagDto, TagResponseDto } from './dto/tag.dto';
import { BoxesService } from '../boxes/boxes.service';
import { StorageObject } from '../files/schemas/file.schema';

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
    @InjectModel(StorageObject.name) private fileModel: Model<StorageObject>,
    private boxesService: BoxesService,
  ) {}

  async create(
    boxId: string,
    createTagDto: CreateTagDto,
    userId: string,
    userName: string,
  ): Promise<TagResponseDto> {
    // Verify box exists and user has access
    await this.boxesService.findOneByAuth(boxId, userId);

    // Check for duplicate tag name in the box
    const existingTag = await this.tagModel.findOne({
      box: boxId,
      name: { $regex: new RegExp(`^${createTagDto.name}$`, 'i') },
    });

    if (existingTag) {
      throw new BadRequestException('Tag with this name already exists in the box');
    }

    const tag = new this.tagModel({
      box: boxId,
      name: createTagDto.name,
      color: createTagDto.color || '#3B82F6',
      createdBy: userId,
      createdByName: userName,
    });

    const savedTag = await tag.save();
    return this.toResponseDto(savedTag);
  }

  async findAllByBox(boxId: string, userId: string): Promise<TagResponseDto[]> {
    // Verify box exists and user has access
    await this.boxesService.findOneByAuth(boxId, userId);

    const tags = await this.tagModel.find({ box: boxId }).sort({ name: 1 });
    return tags.map((tag) => this.toResponseDto(tag));
  }

  async findById(tagId: string, userId: string): Promise<TagResponseDto> {
    const tag = await this.tagModel.findById(tagId);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Verify user has access to the box
    await this.boxesService.findOneByAuth(tag.box, userId);

    return this.toResponseDto(tag);
  }

  async update(
    tagId: string,
    updateTagDto: UpdateTagDto,
    userId: string,
  ): Promise<TagResponseDto> {
    const tag = await this.tagModel.findById(tagId);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Verify user has access to the box
    await this.boxesService.findOneByAuth(tag.box, userId);

    // Check for duplicate name if changing name
    if (updateTagDto.name && updateTagDto.name !== tag.name) {
      const existingTag = await this.tagModel.findOne({
        box: tag.box,
        name: { $regex: new RegExp(`^${updateTagDto.name}$`, 'i') },
        _id: { $ne: tagId },
      });

      if (existingTag) {
        throw new BadRequestException('Tag with this name already exists in the box');
      }
    }

    Object.assign(tag, updateTagDto);
    const updatedTag = await tag.save();
    return this.toResponseDto(updatedTag);
  }

  async delete(tagId: string, userId: string): Promise<void> {
    const tag = await this.tagModel.findById(tagId);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Verify user has access to the box
    await this.boxesService.findOneByAuth(tag.box, userId);

    // Remove tag from all files
    await this.fileModel.updateMany(
      { tags: tagId },
      { $pull: { tags: tagId }, $inc: { tagsSize: -1 } },
    );

    await this.tagModel.findByIdAndDelete(tagId);
  }

  async addTagToFiles(
    tagId: string,
    fileIds: string[],
    userId: string,
  ): Promise<{ updated: number }> {
    const tag = await this.tagModel.findById(tagId);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Verify user has access to the box
    await this.boxesService.findOneByAuth(tag.box, userId);

    // Add tag to files that don't already have it
    const result = await this.fileModel.updateMany(
      {
        _id: { $in: fileIds.map((id) => new Types.ObjectId(id)) },
        box: tag.box,
        tags: { $ne: tagId },
      },
      { $push: { tags: tagId }, $inc: { tagsSize: 1 } },
    );

    // Update tag count
    await this.updateTagCount(tagId);

    return { updated: result.modifiedCount };
  }

  async removeTagFromFiles(
    tagId: string,
    fileIds: string[],
    userId: string,
  ): Promise<{ updated: number }> {
    const tag = await this.tagModel.findById(tagId);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Verify user has access to the box
    await this.boxesService.findOneByAuth(tag.box, userId);

    // Remove tag from files
    const result = await this.fileModel.updateMany(
      {
        _id: { $in: fileIds.map((id) => new Types.ObjectId(id)) },
        box: tag.box,
        tags: tagId,
      },
      { $pull: { tags: tagId }, $inc: { tagsSize: -1 } },
    );

    // Update tag count
    await this.updateTagCount(tagId);

    return { updated: result.modifiedCount };
  }

  private async updateTagCount(tagId: string): Promise<void> {
    const count = await this.fileModel.countDocuments({ tags: tagId, status: 1 });
    await this.tagModel.findByIdAndUpdate(tagId, { count });
  }

  private toResponseDto(tag: TagDocument): TagResponseDto {
    return {
      id: tag._id.toString(),
      name: tag.name,
      color: tag.color,
      count: tag.count,
      createdBy: tag.createdBy,
      createdByName: tag.createdByName,
      createdAt: tag.createdAt,
    };
  }
}
