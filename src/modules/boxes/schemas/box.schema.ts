import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BoxDocument = Box & Document;

/**
 * Box Type Enum
 * 0: Public Read/Write - Anyone can read and write
 * 1: Public Write - Anyone can write, only members can read
 * 2: Public Read - Anyone can read, only members can write
 * 3: Share - Only invited members can access (default for shared boxes)
 * 4: Private - Only owner has access
 */
export enum BoxType {
  PUBLIC_READ_WRITE = 0,
  PUBLIC_WRITE = 1,
  PUBLIC_READ = 2,
  SHARE = 3,
  PRIVATE = 4,
}

/**
 * Box Status Enum
 * 1: Active
 * 2: Archived/Deleted
 */
export enum BoxStatus {
  ACTIVE = 1,
  ARCHIVED = 2,
}

@Schema({ _id: false })
export class BoxTag {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: Number, default: 0 })
  count: number;
}

@Schema({ _id: false })
export class BoxLinkInfo {
  @Prop()
  subject?: string;

  @Prop()
  message?: string;

  @Prop({ type: Boolean, default: false })
  isEnabled: boolean;

  @Prop()
  password?: string;

  @Prop({ type: [String], default: [] })
  recipient: string[];
}

@Schema({ _id: false })
export class ContainerACL {
  @Prop({ type: [String], default: [] })
  readUsers: string[];

  @Prop({ type: [String], default: [] })
  writeUsers: string[];
}

@Schema({ _id: false })
export class SwiftContainer {
  @Prop({ required: true })
  name: string;

  @Prop({ type: ContainerACL })
  ACL: ContainerACL;
}

@Schema({ _id: false })
export class SwiftTenant {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;
}

@Schema({ _id: false })
export class SwiftConfig {
  @Prop({ type: SwiftTenant, required: true })
  tenant: SwiftTenant;

  @Prop({ type: SwiftContainer, required: true })
  container: SwiftContainer;
}

/**
 * Box Schema
 * Represents a project/workspace for organizing files and collaborating with team members
 */
@Schema({ collection: 'boxes', timestamps: true })
export class Box {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  // Owner and members
  @Prop({ required: true, index: true })
  owner: string; // User ID of the box owner

  @Prop({ type: [String], default: [], index: true })
  members: string[]; // User IDs of collaborators

  // Storage configuration (abstracted for multi-cloud support)
  @Prop({ type: SwiftConfig })
  swift?: SwiftConfig; // Legacy Swift configuration (still supported)

  @Prop()
  storageProvider?: string; // 'swift' | 'aws' | 'gcs'

  @Prop()
  storageContainerName?: string; // Container/bucket name in the storage provider

  // Box metadata
  @Prop({ required: true, index: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: [BoxTag], default: [] })
  tags: BoxTag[];

  // Size tracking
  @Prop({ type: Number, default: 0 })
  size: number; // Total size in bytes

  @Prop({ type: Number, default: 0 })
  fileLength: number; // Total number of files

  // Box type and status
  @Prop({ type: Number, enum: Object.values(BoxType), default: BoxType.PRIVATE, index: true })
  type: BoxType;

  @Prop({ type: Number, enum: Object.values(BoxStatus), default: BoxStatus.ACTIVE, index: true })
  status: BoxStatus;

  // Link sharing configuration
  @Prop({ type: BoxLinkInfo })
  linkInfo?: BoxLinkInfo;

  // Timestamps
  @Prop({ type: Date, default: Date.now })
  createDate: Date;

  @Prop({ type: Date, default: Date.now })
  lastModifyDate: Date;
}

export const BoxSchema = SchemaFactory.createForClass(Box);

// Indexes for efficient queries
BoxSchema.index({ owner: 1, status: 1 });
BoxSchema.index({ members: 1, status: 1 });
BoxSchema.index({ owner: 1, name: 1 }, { unique: true });
BoxSchema.index({ 'tags.name': 1 });

// Virtual for checking if box is shared
BoxSchema.virtual('isShared').get(function (this: BoxDocument) {
  return this.members && this.members.length > 0;
});

// Virtual for checking if box is public
BoxSchema.virtual('isPublic').get(function (this: BoxDocument) {
  return this.type >= BoxType.PUBLIC_READ_WRITE && this.type <= BoxType.PUBLIC_READ;
});

// Virtual for human-readable size
BoxSchema.virtual('sizeFormatted').get(function (this: BoxDocument) {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
});

// Pre-save middleware to update lastModifyDate
BoxSchema.pre('save', function (next) {
  this.lastModifyDate = new Date();
  next();
});
