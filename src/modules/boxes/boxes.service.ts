import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Box, BoxDocument, BoxStatus, BoxType } from './schemas/box.schema';
import { CreateBoxDto, UpdateBoxDto, AddMembersDto, ShareBoxDto } from './dto/box.dto';
import { StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class BoxesService {
  private readonly logger = new Logger(BoxesService.name);
  private readonly defaultStorageProvider: string;

  constructor(
    @InjectModel(Box.name) private boxModel: Model<BoxDocument>,
    private storageService: StorageService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    this.defaultStorageProvider = this.configService.get<string>('storage.provider', 'swift');
  }

  /**
   * Create a new box
   */
  async create(createBoxDto: CreateBoxDto, ownerId: string): Promise<BoxDocument> {
    // Check if box name already exists for this user
    const existing = await this.boxModel.findOne({
      owner: ownerId,
      name: createBoxDto.name,
      status: BoxStatus.ACTIVE,
    });

    if (existing) {
      throw new ConflictException('A box with this name already exists');
    }

    // Determine storage provider
    const storageProvider = createBoxDto.storageProvider || this.defaultStorageProvider;

    // Get user for container naming
    const owner = await this.usersService.findById(ownerId);
    if (!owner) {
      throw new NotFoundException('Owner user not found');
    }

    // Generate container name based on box type
    const boxId = new Types.ObjectId();
    const containerName = this.generateContainerName(owner.username || owner.email.split('@')[0], boxId.toString(), createBoxDto.type);

    // Create storage container
    try {
      await this.storageService.createContainer(containerName, {
        metadata: {
          boxId: boxId.toString(),
          boxName: createBoxDto.name,
          owner: ownerId,
        },
      });
      this.logger.log(`Created storage container: ${containerName}`);
    } catch (error) {
      this.logger.error(`Failed to create storage container: ${error.message}`);
      throw new BadRequestException('Failed to create storage container');
    }

    // Create box
    const box = new this.boxModel({
      _id: boxId,
      owner: ownerId,
      name: createBoxDto.name,
      description: createBoxDto.description,
      type: createBoxDto.type ?? BoxType.PRIVATE,
      members: createBoxDto.members || [],
      tags: createBoxDto.tags || [],
      linkInfo: createBoxDto.linkInfo,
      storageProvider,
      storageContainerName: containerName,
      status: BoxStatus.ACTIVE,
      size: 0,
      fileLength: 0,
      createDate: new Date(),
      lastModifyDate: new Date(),
    });

    // If using Swift (legacy), set Swift config
    if (storageProvider === 'swift') {
      box.swift = {
        tenant: {
          id: this.configService.get<string>('storage.swift.tenantId', '6049fcdd4c3a46909a9dbaad04f1636a'),
          name: this.configService.get<string>('storage.swift.tenantName', 'service'),
        },
        container: {
          name: containerName,
          ACL: {
            readUsers: [],
            writeUsers: [],
          },
        },
      };
    }

    await box.save();
    this.logger.log(`Box created: ${box.name} (${box._id}) by ${ownerId}`);

    return box;
  }

  /**
   * Find all boxes for a user (owner or member)
   */
  async findByUser(userId: string, includeArchived = false): Promise<BoxDocument[]> {
    const query: any = {
      $or: [{ owner: userId }, { members: userId }],
    };

    if (!includeArchived) {
      query.status = BoxStatus.ACTIVE;
    }

    return this.boxModel.find(query).sort({ lastModifyDate: -1 }).exec();
  }

  /**
   * Find boxes owned by a user
   */
  async findByOwner(userId: string, includeArchived = false): Promise<BoxDocument[]> {
    const query: any = { owner: userId };

    if (!includeArchived) {
      query.status = BoxStatus.ACTIVE;
    }

    return this.boxModel.find(query).sort({ lastModifyDate: -1 }).exec();
  }

  /**
   * Find one box by ID with authorization check
   */
  async findOneByAuth(boxId: string, userId: string): Promise<BoxDocument> {
    const box = await this.boxModel.findById(boxId).exec();

    if (!box) {
      throw new NotFoundException('Box not found');
    }

    // Check if user has access (owner or member)
    if (box.owner !== userId && !box.members.includes(userId)) {
      throw new ForbiddenException('You do not have access to this box');
    }

    return box;
  }

  /**
   * Find one box by ID (no auth check - for internal use)
   */
  async findById(boxId: string): Promise<BoxDocument> {
    const box = await this.boxModel.findById(boxId).exec();

    if (!box) {
      throw new NotFoundException('Box not found');
    }

    return box;
  }

  /**
   * Find box by owner and name
   */
  async findByOwnerAndName(ownerId: string, name: string): Promise<BoxDocument | null> {
    return this.boxModel.findOne({
      owner: ownerId,
      name,
      status: BoxStatus.ACTIVE,
    }).exec();
  }

  /**
   * Check if box name is available for user
   */
  async isNameAvailable(ownerId: string, name: string, excludeBoxId?: string): Promise<boolean> {
    const query: any = {
      owner: ownerId,
      name,
      status: BoxStatus.ACTIVE,
    };

    if (excludeBoxId) {
      query._id = { $ne: excludeBoxId };
    }

    const existing = await this.boxModel.findOne(query).exec();
    return !existing;
  }

  /**
   * Update a box
   */
  async update(boxId: string, updateBoxDto: UpdateBoxDto, userId: string): Promise<BoxDocument> {
    const box = await this.boxModel.findById(boxId).exec();

    if (!box) {
      throw new NotFoundException('Box not found');
    }

    // Only owner can update box metadata
    if (box.owner !== userId) {
      throw new ForbiddenException('Only the owner can update this box');
    }

    // Check name uniqueness if name is being changed
    if (updateBoxDto.name && updateBoxDto.name !== box.name) {
      const isAvailable = await this.isNameAvailable(userId, updateBoxDto.name, boxId);
      if (!isAvailable) {
        throw new ConflictException('A box with this name already exists');
      }
    }

    // Update fields
    Object.assign(box, updateBoxDto);
    box.lastModifyDate = new Date();

    await box.save();
    this.logger.log(`Box updated: ${box.name} (${box._id})`);

    return box;
  }

  /**
   * Add members to a box
   */
  async addMembers(boxId: string, addMembersDto: AddMembersDto, userId: string): Promise<BoxDocument> {
    const box = await this.boxModel.findById(boxId).exec();

    if (!box) {
      throw new NotFoundException('Box not found');
    }

    // Only owner can add members
    if (box.owner !== userId) {
      throw new ForbiddenException('Only the owner can add members to this box');
    }

    // Resolve member IDs from usernames if needed
    const memberIds: string[] = [];
    for (const memberIdentifier of addMembersDto.members) {
      // Try to find by ID first, then by username
      let user = await this.usersService.findById(memberIdentifier).catch(() => null);
      if (!user) {
        user = await this.usersService.findByUsername(memberIdentifier).catch(() => null);
      }

      if (!user) {
        throw new NotFoundException(`User not found: ${memberIdentifier}`);
      }

      // Check if user already has too many boxes (limit: 5 as per legacy code)
      const userBoxes = await this.findByUser(user._id);
      if (userBoxes.length >= 5) {
        throw new BadRequestException(`User ${user.username || user.email} has reached the maximum number of boxes (5)`);
      }

      memberIds.push(user._id);
    }

    // Add unique members
    const newMembers = memberIds.filter((id) => !box.members.includes(id) && id !== box.owner);
    if (newMembers.length > 0) {
      box.members.push(...newMembers);
      box.lastModifyDate = new Date();
      await box.save();

      this.logger.log(`Added ${newMembers.length} members to box: ${box.name} (${box._id})`);

      // TODO: Send invitation emails (implement notification service)
      // notification.invited(host, box, users, sessionUser);
    }

    // Update storage ACL if applicable
    await this.updateStorageACL(box);

    return box;
  }

  /**
   * Remove a member from a box
   */
  async removeMember(boxId: string, memberId: string, userId: string): Promise<BoxDocument> {
    const box = await this.boxModel.findById(boxId).exec();

    if (!box) {
      throw new NotFoundException('Box not found');
    }

    // Owner can remove any member, member can remove themselves
    if (box.owner !== userId && memberId !== userId) {
      throw new ForbiddenException('You do not have permission to remove this member');
    }

    // Remove member
    box.members = box.members.filter((id) => id !== memberId);
    box.lastModifyDate = new Date();
    await box.save();

    this.logger.log(`Removed member ${memberId} from box: ${box.name} (${box._id})`);

    // Update storage ACL
    await this.updateStorageACL(box);

    return box;
  }

  /**
   * Archive (soft delete) a box
   */
  async archive(boxId: string, userId: string): Promise<BoxDocument> {
    const box = await this.boxModel.findById(boxId).exec();

    if (!box) {
      throw new NotFoundException('Box not found');
    }

    // Owner can archive, members can just remove themselves
    if (box.owner === userId) {
      box.status = BoxStatus.ARCHIVED;
      box.lastModifyDate = new Date();
      await box.save();
      this.logger.log(`Box archived: ${box.name} (${box._id})`);
    } else if (box.members.includes(userId)) {
      // Member removing themselves
      return this.removeMember(boxId, userId, userId);
    } else {
      throw new ForbiddenException('You do not have access to this box');
    }

    return box;
  }

  /**
   * Restore an archived box
   */
  async restore(boxId: string, userId: string): Promise<BoxDocument> {
    const box = await this.boxModel.findById(boxId).exec();

    if (!box) {
      throw new NotFoundException('Box not found');
    }

    // Only owner can restore
    if (box.owner !== userId) {
      throw new ForbiddenException('Only the owner can restore this box');
    }

    box.status = BoxStatus.ACTIVE;
    box.lastModifyDate = new Date();
    await box.save();

    this.logger.log(`Box restored: ${box.name} (${box._id})`);
    return box;
  }

  /**
   * Permanently delete a box and its storage container
   */
  async delete(boxId: string, userId: string): Promise<void> {
    const box = await this.boxModel.findById(boxId).exec();

    if (!box) {
      throw new NotFoundException('Box not found');
    }

    // Only owner can delete
    if (box.owner !== userId) {
      throw new ForbiddenException('Only the owner can delete this box');
    }

    // TODO: Delete all files in the box first (implement when Files module is ready)
    // This would involve deleting all StorageObject records and their actual files

    // Delete storage container
    try {
      if (box.storageContainerName) {
        await this.storageService.deleteContainer(box.storageContainerName);
        this.logger.log(`Deleted storage container: ${box.storageContainerName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete storage container: ${error.message}`);
      // Continue with box deletion even if container deletion fails
    }

    // Delete box
    await this.boxModel.deleteOne({ _id: boxId }).exec();
    this.logger.log(`Box permanently deleted: ${box.name} (${box._id})`);
  }

  /**
   * Bulk archive boxes
   */
  async bulkArchive(boxIds: string[], userId: string): Promise<number> {
    const boxes = await this.boxModel.find({
      _id: { $in: boxIds },
      owner: userId, // Only owner can archive
    }).exec();

    for (const box of boxes) {
      box.status = BoxStatus.ARCHIVED;
      box.lastModifyDate = new Date();
      await box.save();
    }

    this.logger.log(`Bulk archived ${boxes.length} boxes by user ${userId}`);
    return boxes.length;
  }

  /**
   * Bulk restore boxes
   */
  async bulkRestore(boxIds: string[], userId: string): Promise<number> {
    const boxes = await this.boxModel.find({
      _id: { $in: boxIds },
      owner: userId, // Only owner can restore
    }).exec();

    for (const box of boxes) {
      box.status = BoxStatus.ACTIVE;
      box.lastModifyDate = new Date();
      await box.save();
    }

    this.logger.log(`Bulk restored ${boxes.length} boxes by user ${userId}`);
    return boxes.length;
  }

  /**
   * Update box size and file count
   */
  async updateStats(boxId: string, sizeDelta: number, fileDelta: number): Promise<void> {
    const box = await this.boxModel.findById(boxId).exec();

    if (!box) {
      throw new NotFoundException('Box not found');
    }

    box.size = Math.max(0, box.size + sizeDelta);
    box.fileLength = Math.max(0, box.fileLength + fileDelta);
    box.lastModifyDate = new Date();

    await box.save();
  }

  /**
   * Share box with users (update ACL and send notifications)
   */
  async shareBox(boxId: string, shareDto: ShareBoxDto, userId: string): Promise<BoxDocument> {
    const box = await this.boxModel.findById(boxId).exec();

    if (!box) {
      throw new NotFoundException('Box not found');
    }

    // Only owner can share
    if (box.owner !== userId) {
      throw new ForbiddenException('Only the owner can share this box');
    }

    // Update link info
    box.linkInfo = {
      subject: shareDto.subject,
      message: shareDto.message || '',
      isEnabled: true,
      password: shareDto.passwordEnabled ? shareDto.password : undefined,
      recipient: shareDto.to || [],
    };

    // Add members if specified
    if (shareDto.to && shareDto.to.length > 0) {
      await this.addMembers(boxId, { members: shareDto.to, subject: shareDto.subject, message: shareDto.message }, userId);
    }

    box.lastModifyDate = new Date();
    await box.save();

    this.logger.log(`Box shared: ${box.name} (${box._id})`);
    return box;
  }

  /**
   * Close/disable sharing for a box
   */
  async closeSharing(boxId: string, userId: string): Promise<BoxDocument> {
    const box = await this.boxModel.findById(boxId).exec();

    if (!box) {
      throw new NotFoundException('Box not found');
    }

    // Only owner can close sharing
    if (box.owner !== userId) {
      throw new ForbiddenException('Only the owner can close sharing');
    }

    if (box.linkInfo) {
      box.linkInfo.isEnabled = false;
    }

    box.lastModifyDate = new Date();
    await box.save();

    this.logger.log(`Box sharing closed: ${box.name} (${box._id})`);
    return box;
  }

  // ============================================
  // Private helper methods
  // ============================================

  /**
   * Generate container name based on user and box type
   */
  private generateContainerName(username: string, boxId: string, type?: BoxType): string {
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_');
    const typeStr = type === BoxType.SHARE ? 'share' : 'box';
    return `${sanitizedUsername}_${typeStr}_${boxId}`;
  }

  /**
   * Update storage ACL based on box members
   */
  private async updateStorageACL(box: BoxDocument): Promise<void> {
    try {
      // For Swift, update container ACL
      if (box.storageProvider === 'swift' && box.swift?.container) {
        const readUsers: string[] = [];
        const writeUsers: string[] = [];

        // Owner has full access
        const owner = await this.usersService.findById(box.owner);
        if (owner) {
          const ownerUsername = owner.username || owner.email.split('@')[0];
          readUsers.push(`service:${ownerUsername}`);
          writeUsers.push(`service:${ownerUsername}`);
        }

        // Members based on box type
        for (const memberId of box.members) {
          const member = await this.usersService.findById(memberId);
          if (member) {
            const memberUsername = member.username || member.email.split('@')[0];

            if (box.type === BoxType.PUBLIC_READ_WRITE || box.type === BoxType.PUBLIC_WRITE || box.type === BoxType.SHARE) {
              writeUsers.push(`service:${memberUsername}`);
            }

            if (box.type === BoxType.PUBLIC_READ_WRITE || box.type === BoxType.PUBLIC_READ || box.type === BoxType.SHARE) {
              readUsers.push(`service:${memberUsername}`);
            }
          }
        }

        // Update Swift ACL
        box.swift.container.ACL = { readUsers, writeUsers };
        await box.save();

        this.logger.log(`Updated storage ACL for box: ${box.name} (${box._id})`);
      }

      // TODO: Implement ACL updates for AWS S3 and GCS if needed
    } catch (error) {
      this.logger.error(`Failed to update storage ACL: ${error.message}`);
      // Don't throw - ACL update is not critical for box operations
    }
  }
}
