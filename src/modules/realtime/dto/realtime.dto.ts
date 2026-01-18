import { IsString, IsOptional, IsNumber, IsObject, IsEnum } from 'class-validator';

export enum EventType {
  // File events
  FILE_UPLOADED = 'file:uploaded',
  FILE_UPDATED = 'file:updated',
  FILE_DELETED = 'file:deleted',
  FILE_UPLOAD_PROGRESS = 'file:upload:progress',

  // Box events
  BOX_CREATED = 'box:created',
  BOX_UPDATED = 'box:updated',
  BOX_DELETED = 'box:deleted',
  BOX_MEMBER_ADDED = 'box:member:added',
  BOX_MEMBER_REMOVED = 'box:member:removed',

  // Note events
  NOTE_CREATED = 'note:created',
  NOTE_UPDATED = 'note:updated',
  NOTE_DELETED = 'note:deleted',
  NOTE_POSITION_CHANGED = 'note:position',

  // User events
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',
  USER_TYPING = 'user:typing',

  // Notification events
  NOTIFICATION_NEW = 'notification:new',
  NOTIFICATION_READ = 'notification:read',

  // System events
  SYSTEM_MESSAGE = 'system:message',
}

export class FileUploadProgressDto {
  @IsString()
  fileId: string;

  @IsString()
  fileName: string;

  @IsString()
  boxId: string;

  @IsNumber()
  progress: number; // 0-100

  @IsNumber()
  uploadedBytes: number;

  @IsNumber()
  totalBytes: number;

  @IsString()
  userId: string;
}

export class FileEventDto {
  @IsString()
  fileId: string;

  @IsString()
  fileName: string;

  @IsString()
  boxId: string;

  @IsString()
  userId: string;

  @IsString()
  userName: string;

  @IsString()
  @IsEnum(EventType)
  eventType: EventType;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class BoxEventDto {
  @IsString()
  boxId: string;

  @IsString()
  boxName: string;

  @IsString()
  userId: string;

  @IsString()
  userName: string;

  @IsString()
  @IsEnum(EventType)
  eventType: EventType;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UserPresenceDto {
  @IsString()
  userId: string;

  @IsString()
  userName: string;

  @IsString()
  status: 'online' | 'offline' | 'away';

  @IsOptional()
  @IsString()
  currentBoxId?: string;
}

export class NotificationDto {
  @IsString()
  id: string;

  @IsString()
  userId: string;

  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: any;

  @IsString()
  createdAt: string;
}

export class JoinRoomDto {
  @IsString()
  roomId: string;

  @IsOptional()
  @IsString()
  roomType?: 'box' | 'user' | 'global';
}

export class LeaveRoomDto {
  @IsString()
  roomId: string;
}

export class SystemMessageDto {
  @IsString()
  message: string;

  @IsString()
  type: 'info' | 'warning' | 'error' | 'success';

  @IsOptional()
  @IsObject()
  data?: any;
}
