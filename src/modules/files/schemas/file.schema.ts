import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FileDocument = StorageObject & Document;

/**
 * File Type Enum
 * 1: Member insert (uploaded by a member)
 * 2: Public insert (uploaded by public user)
 */
export enum FileType {
  MEMBER_INSERT = 1,
  PUBLIC_INSERT = 2,
}

/**
 * File Status Enum
 * 1: Active
 * 2: Deleted
 */
export enum FileStatus {
  ACTIVE = 1,
  DELETED = 2,
}

@Schema({ _id: false })
export class FileVersion {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  uploadDate: Date;

  @Prop()
  uploadUser: string;

  @Prop()
  uploadUsername: string;

  @Prop()
  description?: string;

  @Prop()
  mime?: string;
}

@Schema({ _id: false })
export class FileImages {
  @Prop()
  width?: number;

  @Prop()
  height?: number;

  @Prop()
  orientation?: number;

  @Prop({ type: Object })
  thumbnails?: Record<string, any>;
}

@Schema({ _id: false })
export class FileScribd {
  @Prop()
  id?: string;

  @Prop()
  key?: string;

  @Prop()
  password?: string;
}

@Schema({ _id: false })
export class FilePublic {
  @Prop()
  enabled?: boolean;

  @Prop()
  link?: string;

  @Prop()
  expiresAt?: Date;
}

/**
 * StorageObject Schema
 * Represents a file stored in the system
 */
@Schema({ collection: 'storageobjects', timestamps: false })
export class StorageObject {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  // Box and member information
  @Prop({ required: true, index: true })
  box: string; // Box ID this file belongs to

  @Prop({ type: [String], default: [], index: true })
  members: string[]; // User IDs who have access to this file

  // Storage information
  @Prop({ required: true })
  container: string; // Storage container/bucket name

  // File metadata
  @Prop({ required: true })
  name: string; // Original filename

  @Prop()
  ext: string; // File extension (e.g., 'pdf', 'jpg')

  @Prop()
  mime: string; // MIME type (e.g., 'application/pdf', 'image/jpeg')

  @Prop({ type: Number, required: true })
  size: number; // File size in bytes

  @Prop()
  description?: string;

  @Prop()
  link?: string; // Direct download link

  // Image-specific metadata
  @Prop({ type: FileImages })
  images?: FileImages;

  // Document preview (Scribd integration - legacy)
  @Prop({ type: FileScribd })
  scribd?: FileScribd;

  // Tags and categorization
  @Prop({ type: [String], default: [], index: true })
  tags: string[]; // Tag IDs from the box

  @Prop({ type: Number, default: 0 })
  tagsSize: number; // Number of tags

  // File status and type
  @Prop({ type: Number, enum: Object.values(FileStatus), default: FileStatus.ACTIVE, index: true })
  status: FileStatus;

  @Prop({ type: Number, enum: Object.values(FileType), default: FileType.MEMBER_INSERT })
  type: FileType;

  // Author and modification tracking
  @Prop({ required: true, index: true })
  author: string; // User ID of the uploader

  @Prop()
  authorName?: string; // Display name of the uploader

  @Prop()
  lastModifyUser?: string; // User ID of last modifier

  @Prop()
  lastModifyUsername?: string; // Display name of last modifier

  // Timestamps
  @Prop({ type: Date, default: Date.now, index: true })
  uploadDate: Date;

  @Prop({ type: Date, default: Date.now })
  lastModifyDate: Date;

  // Flags
  @Prop({ type: Boolean, default: false })
  isSended: boolean; // File has been sent/shared

  @Prop({ type: Boolean, default: false })
  isReceived: boolean; // File has been received

  // Public sharing
  @Prop({ type: FilePublic })
  public?: FilePublic;

  // Version control
  @Prop({ type: [FileVersion], default: [] })
  versions: FileVersion[];
}

export const StorageObjectSchema = SchemaFactory.createForClass(StorageObject);

// Indexes for efficient queries
StorageObjectSchema.index({ box: 1, status: 1 });
StorageObjectSchema.index({ box: 1, name: 1 });
StorageObjectSchema.index({ members: 1, status: 1 });
StorageObjectSchema.index({ author: 1, uploadDate: -1 });
StorageObjectSchema.index({ tags: 1 });
StorageObjectSchema.index({ uploadDate: -1 });

// Virtual for getting file extension from name
StorageObjectSchema.virtual('extension').get(function (this: FileDocument) {
  if (this.ext) return this.ext;
  const parts = this.name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
});

// Virtual for human-readable size
StorageObjectSchema.virtual('sizeFormatted').get(function (this: FileDocument) {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for checking if file has versions
StorageObjectSchema.virtual('hasVersions').get(function (this: FileDocument) {
  return this.versions && this.versions.length > 0;
});

// Virtual for getting version count
StorageObjectSchema.virtual('versionCount').get(function (this: FileDocument) {
  return this.versions ? this.versions.length : 0;
});

// Virtual for checking if file is an image
StorageObjectSchema.virtual('isImage').get(function (this: FileDocument) {
  return this.mime ? this.mime.startsWith('image/') : false;
});

// Virtual for checking if file is a document
StorageObjectSchema.virtual('isDocument').get(function (this: FileDocument) {
  const docMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  return this.mime ? docMimes.includes(this.mime) : false;
});

// Pre-save middleware to update lastModifyDate
StorageObjectSchema.pre('save', function (next) {
  this.lastModifyDate = new Date();
  next();
});
