import { IsString, IsOptional, IsBoolean, IsEnum, IsObject, IsArray, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../schemas/notification.schema';

export class CreateNotificationDto {
  @ApiProperty({ description: 'User ID who will receive the notification' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Notification type', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Related entity ID (file, box, user, etc.)' })
  @IsString()
  @IsOptional()
  relatedEntityId?: string;

  @ApiPropertyOptional({ description: 'Related entity type' })
  @IsString()
  @IsOptional()
  relatedEntityType?: string;

  @ApiPropertyOptional({ description: 'Additional data' })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Actor who triggered the notification' })
  @IsString()
  @IsOptional()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Actor name' })
  @IsString()
  @IsOptional()
  actorName?: string;

  @ApiPropertyOptional({ description: 'Action URL' })
  @IsString()
  @IsOptional()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Action button text' })
  @IsString()
  @IsOptional()
  actionText?: string;
}

export class MarkAsReadDto {
  @ApiProperty({ description: 'Notification IDs to mark as read' })
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];
}

export class NotificationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @ApiPropertyOptional({ description: 'Filter by notification type', enum: NotificationType })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}

export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Notification type', enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ description: 'Title' })
  title: string;

  @ApiProperty({ description: 'Message' })
  message: string;

  @ApiPropertyOptional({ description: 'Related entity ID' })
  relatedEntityId?: string;

  @ApiPropertyOptional({ description: 'Related entity type' })
  relatedEntityType?: string;

  @ApiPropertyOptional({ description: 'Additional data' })
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Actor ID' })
  actorId?: string;

  @ApiPropertyOptional({ description: 'Actor name' })
  actorName?: string;

  @ApiProperty({ description: 'Read status' })
  read: boolean;

  @ApiPropertyOptional({ description: 'Read date' })
  readAt?: Date;

  @ApiPropertyOptional({ description: 'Action URL' })
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Action text' })
  actionText?: string;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Is recent (within 24 hours)' })
  isRecent: boolean;
}

export class NotificationStatsDto {
  @ApiProperty({ description: 'Total notifications' })
  total: number;

  @ApiProperty({ description: 'Unread count' })
  unread: number;

  @ApiProperty({ description: 'Read count' })
  read: number;

  @ApiProperty({ description: 'Recent count (within 24 hours)' })
  recent: number;
}
