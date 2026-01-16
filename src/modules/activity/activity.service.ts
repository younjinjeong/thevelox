import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityDocument, ActivityType } from './schemas/activity.schema';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(@InjectModel(Activity.name) private activityModel: Model<ActivityDocument>) {}

  /**
   * Log an activity
   */
  async log(data: {
    userId: string;
    userName?: string;
    type: ActivityType;
    description: string;
    boxId?: string;
    boxName?: string;
    fileId?: string;
    fileName?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ActivityDocument> {
    const activity = new this.activityModel(data);
    await activity.save();

    this.logger.debug(`Activity logged: ${data.type} by ${data.userName || data.userId}`);

    return activity;
  }

  /**
   * Get activities for a user
   */
  async findByUser(userId: string, limit = 50): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get activities for a box
   */
  async findByBox(boxId: string, limit = 50): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({ boxId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get activities for a file
   */
  async findByFile(fileId: string, limit = 50): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({ fileId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get recent activities across the system
   */
  async findRecent(limit = 100): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get activities by type
   */
  async findByType(type: ActivityType, limit = 50): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({ type })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  // ============================================
  // Helper methods for logging specific activities
  // ============================================

  async logFileUploaded(userId: string, userName: string, fileId: string, fileName: string, boxId: string, boxName: string, metadata?: any) {
    return this.log({
      userId,
      userName,
      type: ActivityType.FILE_UPLOADED,
      description: `Uploaded file "${fileName}" to box "${boxName}"`,
      fileId,
      fileName,
      boxId,
      boxName,
      metadata,
    });
  }

  async logFileDownloaded(userId: string, userName: string, fileId: string, fileName: string) {
    return this.log({
      userId,
      userName,
      type: ActivityType.FILE_DOWNLOADED,
      description: `Downloaded file "${fileName}"`,
      fileId,
      fileName,
    });
  }

  async logBoxCreated(userId: string, userName: string, boxId: string, boxName: string) {
    return this.log({
      userId,
      userName,
      type: ActivityType.BOX_CREATED,
      description: `Created box "${boxName}"`,
      boxId,
      boxName,
    });
  }

  async logMemberAdded(userId: string, userName: string, boxId: string, boxName: string, memberName: string) {
    return this.log({
      userId,
      userName,
      type: ActivityType.MEMBER_ADDED,
      description: `Added ${memberName} to box "${boxName}"`,
      boxId,
      boxName,
      metadata: { memberName },
    });
  }
}
