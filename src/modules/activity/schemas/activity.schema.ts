import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityDocument = Activity & Document;

/**
 * Activity Type Enum
 */
export enum ActivityType {
  // File activities
  FILE_UPLOADED = 'file_uploaded',
  FILE_DOWNLOADED = 'file_downloaded',
  FILE_UPDATED = 'file_updated',
  FILE_DELETED = 'file_deleted',
  FILE_RESTORED = 'file_restored',
  FILE_VERSION_CREATED = 'file_version_created',
  FILE_COPIED = 'file_copied',

  // Box activities
  BOX_CREATED = 'box_created',
  BOX_UPDATED = 'box_updated',
  BOX_DELETED = 'box_deleted',
  BOX_RESTORED = 'box_restored',
  BOX_ARCHIVED = 'box_archived',

  // Member activities
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  BOX_SHARED = 'box_shared',

  // User activities
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_PROFILE_UPDATED = 'user_profile_updated',
  PASSWORD_CHANGED = 'password_changed',
}

/**
 * Activity Log Schema
 * Tracks all user actions in the system
 */
@Schema({ collection: 'activities', timestamps: false })
export class Activity {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  // Actor (user who performed the action)
  @Prop({ required: true, index: true })
  userId: string;

  @Prop()
  userName?: string;

  // Activity type
  @Prop({
    type: String,
    enum: Object.values(ActivityType),
    required: true,
    index: true,
  })
  type: ActivityType;

  // Activity description
  @Prop({ required: true })
  description: string;

  // Related entities
  @Prop({ index: true })
  boxId?: string;

  @Prop()
  boxName?: string;

  @Prop({ index: true })
  fileId?: string;

  @Prop()
  fileName?: string;

  // Additional metadata
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  // Request information
  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  // Timestamp
  @Prop({ type: Date, default: Date.now, index: true })
  timestamp: Date;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

// Indexes for efficient queries
ActivitySchema.index({ userId: 1, timestamp: -1 });
ActivitySchema.index({ boxId: 1, timestamp: -1 });
ActivitySchema.index({ fileId: 1, timestamp: -1 });
ActivitySchema.index({ type: 1, timestamp: -1 });
ActivitySchema.index({ timestamp: -1 });

// TTL index to auto-delete old activities after 180 days (6 months)
ActivitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });
