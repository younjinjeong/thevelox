import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  _id: string; // Keystone user ID

  @Prop({ required: true, unique: true })
  name: string; // System username

  @Prop({ required: false })
  username?: string; // Display username

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false })
  password?: string; // For JWT auth (bcrypt hashed), not used with Keystone

  @Prop({ default: Date.now })
  createDate: Date;

  @Prop({ type: Number, default: 1, enum: [1, 2] })
  status: number; // 1: active, 2: inactive

  @Prop({ type: Number, default: 100 * 1024 * 1024 * 1024 }) // 100GB default
  availableSize: number; // Total quota in bytes

  @Prop({ type: Number, default: 0 })
  usedSize: number; // Used space in bytes

  @Prop({ default: 'en-US' })
  locale: string; // User language preference

  @Prop({
    type: {
      received: { type: Boolean, default: true },
      sent: { type: Boolean, default: true },
      note: { type: Boolean, default: true },
      nospace: { type: Boolean, default: true },
      invited: { type: Boolean, default: true },
      expired: { type: Boolean, default: true },
    },
    default: {},
  })
  notifications: {
    received: boolean; // File received notifications
    sent: boolean; // File sent notifications
    note: boolean; // Note/comment notifications
    nospace: boolean; // Storage quota warning
    invited: boolean; // Box invitation notifications
    expired: boolean; // Link expiration notifications
  };

  @Prop({
    type: {
      nospace: { type: Date, required: false },
    },
    default: {},
  })
  email_sent_flags: {
    nospace?: Date; // Last time nospace email was sent
  };

  @Prop({
    type: {
      theme: { type: String, default: 'light' },
      viewtype: { type: String, default: 'list' },
      conflict: { type: String, default: 'ask' },
      layout: { type: String, default: 'default' },
      dispname: { type: String, default: 'username' },
      timezone: { type: String, default: 'UTC' },
    },
    default: {},
  })
  preference: {
    theme: string; // UI theme: 'light' | 'dark'
    viewtype: string; // File view type: 'list' | 'grid'
    conflict: string; // Upload conflict resolution: 'ask' | 'replace' | 'version'
    layout: string; // UI layout preference
    dispname: string; // Display name preference: 'username' | 'email'
    timezone: string; // User timezone
  };

  @Prop({ type: [String], default: [] })
  roles: string[]; // User roles for RBAC

  @Prop({ type: String, required: false })
  twoFactorSecret?: string; // For 2FA (future enhancement)

  @Prop({ type: Boolean, default: false })
  twoFactorEnabled?: boolean;

  @Prop({ type: Date, required: false })
  lastLoginDate?: Date;

  @Prop({ type: String, required: false })
  lastLoginIp?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ name: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createDate: -1 });

// Virtual for quota percentage
UserSchema.virtual('quotaUsedPercentage').get(function (this: UserDocument) {
  if (this.availableSize === 0) return 0;
  return (this.usedSize / this.availableSize) * 100;
});

// Virtual for remaining space
UserSchema.virtual('remainingSize').get(function (this: UserDocument) {
  return Math.max(0, this.availableSize - this.usedSize);
});

// Method to check if user has space
UserSchema.methods.hasSpace = function (this: UserDocument, requiredSize: number): boolean {
  return this.usedSize + requiredSize <= this.availableSize;
};

// Method to increment used space
UserSchema.methods.incrementUsedSpace = async function (
  this: UserDocument,
  size: number,
): Promise<void> {
  this.usedSize += size;
  await this.save();
};

// Method to decrement used space
UserSchema.methods.decrementUsedSpace = async function (
  this: UserDocument,
  size: number,
): Promise<void> {
  this.usedSize = Math.max(0, this.usedSize - size);
  await this.save();
};

// Enable virtuals in JSON
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });
