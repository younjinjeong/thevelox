import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import {
  UpdateUserDto,
  UpdateUserPreferencesDto,
  UpdateUserNotificationsDto,
} from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ name: createUserDto.name }, { email: createUserDto.email }],
    });

    if (existingUser) {
      throw new ConflictException('User with this name or email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, this.SALT_ROUNDS);

    // Generate user ID (would be from Keystone in original system)
    const userId = this.generateUserId();

    const user = new this.userModel({
      _id: userId,
      name: createUserDto.name,
      username: createUserDto.username || createUserDto.name,
      email: createUserDto.email,
      password: hashedPassword,
      locale: createUserDto.locale || 'en-US',
      status: 1,
      availableSize: 100 * 1024 * 1024 * 1024, // 100GB default
      usedSize: 0,
      createDate: new Date(),
      notifications: {
        received: true,
        sent: true,
        note: true,
        nospace: true,
        invited: true,
        expired: true,
      },
      preference: {
        theme: 'light',
        viewtype: 'list',
        conflict: 'ask',
        layout: 'default',
        dispname: 'username',
        timezone: 'UTC',
      },
      roles: ['user'],
    });

    await user.save();
    this.logger.log(`Created user: ${user.name} (${user._id})`);

    return user;
  }

  /**
   * Find all users
   */
  async findAll(page = 1, limit = 50): Promise<{ users: User[]; total: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find()
        .select('-password')
        .sort({ createDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(),
    ]);

    return { users, total };
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).select('-password').lean().exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ name: username }).exec();
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.log(`Updated user: ${user.name} (${user._id})`);
    return user;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(id: string, preferences: UpdateUserPreferencesDto): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { preference: preferences } },
        { new: true },
      )
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.log(`Updated preferences for user: ${user.name}`);
    return user;
  }

  /**
   * Update user notifications
   */
  async updateNotifications(id: string, notifications: UpdateUserNotificationsDto): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { notifications } },
        { new: true },
      )
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.log(`Updated notifications for user: ${user.name}`);
    return user;
  }

  /**
   * Change user password
   */
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new ConflictException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    user.password = hashedPassword;
    await user.save();

    this.logger.log(`Password changed for user: ${user.name}`);
  }

  /**
   * Validate user password
   */
  async validatePassword(user: UserDocument, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  /**
   * Increment used space
   */
  async incrementUsedSpace(id: string, size: number): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { $inc: { usedSize: size } }).exec();
  }

  /**
   * Decrement used space
   */
  async decrementUsedSpace(id: string, size: number): Promise<void> {
    const user = await this.userModel.findById(id).exec();
    if (user) {
      user.usedSize = Math.max(0, user.usedSize - size);
      await user.save();
    }
  }

  /**
   * Check if user has enough space
   */
  async hasSpace(id: string, requiredSize: number): Promise<boolean> {
    const user = await this.userModel.findById(id).select('usedSize availableSize').exec();
    if (!user) return false;
    return user.usedSize + requiredSize <= user.availableSize;
  }

  /**
   * Get user storage stats
   */
  async getStorageStats(id: string): Promise<{
    used: number;
    available: number;
    remaining: number;
    usedPercentage: number;
  }> {
    const user = await this.userModel.findById(id).select('usedSize availableSize').exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const remaining = Math.max(0, user.availableSize - user.usedSize);
    const usedPercentage = user.availableSize > 0 ? (user.usedSize / user.availableSize) * 100 : 0;

    return {
      used: user.usedSize,
      available: user.availableSize,
      remaining,
      usedPercentage,
    };
  }

  /**
   * Update last login info
   */
  async updateLastLogin(id: string, ip: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      lastLoginDate: new Date(),
      lastLoginIp: ip,
    }).exec();
  }

  /**
   * Soft delete user (set status to inactive)
   */
  async softDelete(id: string): Promise<void> {
    const user = await this.userModel.findByIdAndUpdate(id, { status: 2 }).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.log(`Soft deleted user: ${user.name} (${user._id})`);
  }

  /**
   * Restore soft deleted user
   */
  async restore(id: string): Promise<void> {
    const user = await this.userModel.findByIdAndUpdate(id, { status: 1 }).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.log(`Restored user: ${user.name} (${user._id})`);
  }

  /**
   * Generate user ID (placeholder - would use Keystone ID in production)
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Update user's used storage size
   */
  async updateUsedSize(userId: string, sizeDelta: number): Promise<void> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    user.usedSize = Math.max(0, user.usedSize + sizeDelta);
    await user.save();

    this.logger.log(`Updated used size for user ${userId}: ${sizeDelta > 0 ? '+' : ''}${sizeDelta} bytes`);
  }

  // ==================== Admin Methods ====================

  /**
   * Find all users with admin filters (paginated, searchable)
   */
  async findAllAdmin(
    page = 1,
    limit = 20,
    search?: string,
    status?: number,
  ): Promise<{ users: User[]; total: number; page: number; limit: number }> {
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ];
    }

    if (status !== undefined) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-password -twoFactorSecret')
        .sort({ createDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(query),
    ]);

    return { users, total, page, limit };
  }

  /**
   * Admin update user (bypasses normal restrictions)
   */
  async adminUpdate(id: string, dto: any): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .select('-password')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.log(`Admin updated user: ${user.name} (${user._id})`);
    return user;
  }

  /**
   * Admin reset password (no current password required)
   */
  async adminResetPassword(id: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    user.password = hashedPassword;
    await user.save();

    this.logger.log(`Admin reset password for user: ${user.name} (${id})`);
  }

  /**
   * Hard delete user (permanent)
   */
  async hardDelete(id: string): Promise<void> {
    const user = await this.userModel.findByIdAndDelete(id).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.log(`Permanently deleted user: ${user.name} (${id})`);
  }

  /**
   * Admin create user
   */
  async adminCreate(dto: {
    email: string;
    name: string;
    username?: string;
    password: string;
    roles?: string[];
    availableSize?: number;
  }): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ name: dto.name }, { email: dto.email }],
    });

    if (existingUser) {
      throw new ConflictException('User with this name or email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    const userId = this.generateUserId();

    const user = new this.userModel({
      _id: userId,
      name: dto.name,
      username: dto.username || dto.name,
      email: dto.email,
      password: hashedPassword,
      locale: 'en-US',
      status: 1,
      availableSize: dto.availableSize || 100 * 1024 * 1024 * 1024, // 100GB
      usedSize: 0,
      createDate: new Date(),
      notifications: {
        received: true,
        sent: true,
        note: true,
        nospace: true,
        invited: true,
        expired: true,
      },
      preference: {
        theme: 'light',
        viewtype: 'list',
        conflict: 'ask',
        layout: 'default',
        dispname: 'username',
        timezone: 'UTC',
      },
      roles: dto.roles || ['user'],
    });

    await user.save();
    this.logger.log(`Admin created user: ${user.name} (${user._id})`);

    const result = user.toObject();
    delete result.password;
    return result;
  }
}
