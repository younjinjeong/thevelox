import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

/**
 * Notification Type Enum
 */
export enum NotificationType {
  FILE_UPLOADED = 'file_uploaded',
  FILE_SHARED = 'file_shared',
  FILE_UPDATED = 'file_updated',
  BOX_INVITED = 'box_invited',
  BOX_SHARED = 'box_shared',
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  QUOTA_WARNING = 'quota_warning',
  QUOTA_EXCEEDED = 'quota_exceeded',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
}

/**
 * Notification Schema
 * Stores user notifications for various events
 */
@Schema({ collection: 'notifications', timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  // User who receives the notification
  @Prop({ required: true, index: true })
  userId: string;

  // Notification type
  @Prop({
    type: String,
    enum: Object.values(NotificationType),
    required: true,
    index: true
  })
  type: NotificationType;

  // Notification content
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  // Related entity information
  @Prop()
  relatedEntityId?: string; // File ID, Box ID, User ID, etc.

  @Prop()
  relatedEntityType?: string; // 'file', 'box', 'user', etc.

  // Additional data
  @Prop({ type: Object })
  data?: Record<string, any>;

  // Actor who triggered the notification
  @Prop()
  actorId?: string;

  @Prop()
  actorName?: string;

  // Status
  @Prop({ type: Boolean, default: false, index: true })
  read: boolean;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: Boolean, default: false })
  emailSent: boolean;

  @Prop({ type: Date })
  emailSentAt?: Date;

  // Link for action
  @Prop()
  actionUrl?: string;

  @Prop()
  actionText?: string;

  // Timestamps
  @Prop({ type: Date, default: Date.now, index: true })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes for efficient queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1 });
NotificationSchema.index({ createdAt: -1 });

// TTL index to auto-delete old notifications after 90 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Virtual for checking if notification is recent (within 24 hours)
NotificationSchema.virtual('isRecent').get(function (this: NotificationDocument) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.createdAt > oneDayAgo;
});
