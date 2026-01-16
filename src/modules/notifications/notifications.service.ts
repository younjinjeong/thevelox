import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';
import { CreateNotificationDto, NotificationQueryDto, NotificationStatsDto } from './dto/notification.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private realtimeService: RealtimeService,
  ) {}

  /**
   * Create a new notification
   */
  async create(createDto: CreateNotificationDto): Promise<NotificationDocument> {
    const notification = new this.notificationModel(createDto);
    await notification.save();

    this.logger.log(`Notification created for user ${createDto.userId}: ${createDto.title}`);

    // Send real-time notification
    this.realtimeService.sendNotification(createDto.userId, {
      id: notification._id.toString(),
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: notification.createdAt.toISOString(),
    });

    return notification;
  }

  /**
   * Create notification for multiple users
   */
  async createForUsers(userIds: string[], notificationData: Omit<CreateNotificationDto, 'userId'>): Promise<NotificationDocument[]> {
    const notifications: NotificationDocument[] = [];

    for (const userId of userIds) {
      const notification = await this.create({
        ...notificationData,
        userId,
      });
      notifications.push(notification);
    }

    this.logger.log(`Created ${notifications.length} notifications for multiple users`);
    return notifications;
  }

  /**
   * Get notifications for a user
   */
  async findByUser(userId: string, query: NotificationQueryDto): Promise<{ notifications: NotificationDocument[]; total: number }> {
    const filter: any = { userId };

    if (query.read !== undefined) {
      filter.read = query.read;
    }

    if (query.type) {
      filter.type = query.type;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.notificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);

    return { notifications, total };
  }

  /**
   * Get notification by ID
   */
  async findById(id: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findById(id).exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: id, userId },
      { read: true, readAt: new Date() },
      { new: true },
    ).exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    this.logger.log(`Notification ${id} marked as read by user ${userId}`);

    // Send real-time update
    this.realtimeService.markNotificationAsRead(userId, id);

    return notification;
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      { _id: { $in: notificationIds }, userId },
      { read: true, readAt: new Date() },
    ).exec();

    this.logger.log(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);

    // Send real-time updates
    notificationIds.forEach((id) => {
      this.realtimeService.markNotificationAsRead(userId, id);
    });

    return result.modifiedCount;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() },
    ).exec();

    this.logger.log(`Marked all ${result.modifiedCount} notifications as read for user ${userId}`);

    return result.modifiedCount;
  }

  /**
   * Delete a notification
   */
  async delete(id: string, userId: string): Promise<void> {
    const result = await this.notificationModel.deleteOne({ _id: id, userId }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Notification not found');
    }

    this.logger.log(`Notification ${id} deleted by user ${userId}`);
  }

  /**
   * Delete multiple notifications
   */
  async deleteMultiple(notificationIds: string[], userId: string): Promise<number> {
    const result = await this.notificationModel.deleteMany({
      _id: { $in: notificationIds },
      userId,
    }).exec();

    this.logger.log(`Deleted ${result.deletedCount} notifications for user ${userId}`);

    return result.deletedCount;
  }

  /**
   * Get notification statistics for a user
   */
  async getStats(userId: string): Promise<NotificationStatsDto> {
    const [total, unread, recent] = await Promise.all([
      this.notificationModel.countDocuments({ userId }).exec(),
      this.notificationModel.countDocuments({ userId, read: false }).exec(),
      this.notificationModel.countDocuments({
        userId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }).exec(),
    ]);

    return {
      total,
      unread,
      read: total - unread,
      recent,
    };
  }

  // ============================================
  // Helper methods for creating specific notification types
  // ============================================

  /**
   * Notify user about file upload
   */
  async notifyFileUploaded(userId: string, fileName: string, boxName: string, actorName: string, fileId: string, boxId: string) {
    return this.create({
      userId,
      type: NotificationType.FILE_UPLOADED,
      title: 'New File Uploaded',
      message: `${actorName} uploaded "${fileName}" to ${boxName}`,
      relatedEntityId: fileId,
      relatedEntityType: 'file',
      actorName,
      data: { fileName, boxName, boxId },
      actionUrl: `/boxes/${boxId}/files/${fileId}`,
      actionText: 'View File',
    });
  }

  /**
   * Notify user about box invitation
   */
  async notifyBoxInvited(userId: string, boxName: string, actorName: string, boxId: string) {
    return this.create({
      userId,
      type: NotificationType.BOX_INVITED,
      title: 'Box Invitation',
      message: `${actorName} invited you to collaborate on "${boxName}"`,
      relatedEntityId: boxId,
      relatedEntityType: 'box',
      actorName,
      data: { boxName },
      actionUrl: `/boxes/${boxId}`,
      actionText: 'View Box',
    });
  }

  /**
   * Notify user about quota warning
   */
  async notifyQuotaWarning(userId: string, usedPercentage: number) {
    return this.create({
      userId,
      type: NotificationType.QUOTA_WARNING,
      title: 'Storage Quota Warning',
      message: `You have used ${usedPercentage}% of your storage quota`,
      data: { usedPercentage },
      actionUrl: '/settings/storage',
      actionText: 'Manage Storage',
    });
  }

  /**
   * Notify user about quota exceeded
   */
  async notifyQuotaExceeded(userId: string) {
    return this.create({
      userId,
      type: NotificationType.QUOTA_EXCEEDED,
      title: 'Storage Quota Exceeded',
      message: 'You have exceeded your storage quota. Please free up space or upgrade your plan.',
      actionUrl: '/settings/storage',
      actionText: 'Manage Storage',
    });
  }

  /**
   * Send system announcement to all users
   */
  async sendSystemAnnouncement(userIds: string[], title: string, message: string, data?: any) {
    return this.createForUsers(userIds, {
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title,
      message,
      data,
    });
  }
}
