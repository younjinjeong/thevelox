import { Injectable, Logger } from '@nestjs/common';
import { EventsGateway } from './gateways/events.gateway';
import {
  EventType,
  FileUploadProgressDto,
  FileEventDto,
  BoxEventDto,
  NotificationDto,
  SystemMessageDto,
} from './dto/realtime.dto';

/**
 * Realtime Service
 * Provides methods for other modules to broadcast real-time events
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private eventsGateway: EventsGateway) {}

  // ============================================
  // File Events
  // ============================================

  /**
   * Broadcast file upload progress
   */
  broadcastFileUploadProgress(data: FileUploadProgressDto) {
    this.eventsGateway.emitFileUploadProgress(data);
    this.logger.debug(`File upload progress: ${data.fileName} - ${data.progress}%`);
  }

  /**
   * Broadcast file uploaded event
   */
  broadcastFileUploaded(fileId: string, fileName: string, boxId: string, userId: string, userName: string) {
    const event: FileEventDto = {
      fileId,
      fileName,
      boxId,
      userId,
      userName,
      eventType: EventType.FILE_UPLOADED,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    this.eventsGateway.emitFileUploaded(event);
    this.logger.log(`File uploaded event broadcast: ${fileName} in box ${boxId}`);
  }

  /**
   * Broadcast file updated event
   */
  broadcastFileUpdated(fileId: string, fileName: string, boxId: string, userId: string, userName: string, changes?: any) {
    const event: FileEventDto = {
      fileId,
      fileName,
      boxId,
      userId,
      userName,
      eventType: EventType.FILE_UPDATED,
      metadata: {
        changes,
        timestamp: new Date().toISOString(),
      },
    };

    this.eventsGateway.emitFileUpdated(event);
    this.logger.log(`File updated event broadcast: ${fileName}`);
  }

  /**
   * Broadcast file deleted event
   */
  broadcastFileDeleted(fileId: string, fileName: string, boxId: string, userId: string, userName: string) {
    const event: FileEventDto = {
      fileId,
      fileName,
      boxId,
      userId,
      userName,
      eventType: EventType.FILE_DELETED,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    this.eventsGateway.emitFileDeleted(event);
    this.logger.log(`File deleted event broadcast: ${fileName}`);
  }

  // ============================================
  // Box Events
  // ============================================

  /**
   * Broadcast box created event
   */
  broadcastBoxCreated(boxId: string, boxName: string, userId: string, userName: string) {
    const event: BoxEventDto = {
      boxId,
      boxName,
      userId,
      userName,
      eventType: EventType.BOX_CREATED,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    this.eventsGateway.emitBoxCreated(event);
    this.logger.log(`Box created event broadcast: ${boxName}`);
  }

  /**
   * Broadcast box updated event
   */
  broadcastBoxUpdated(boxId: string, boxName: string, userId: string, userName: string, changes?: any) {
    const event: BoxEventDto = {
      boxId,
      boxName,
      userId,
      userName,
      eventType: EventType.BOX_UPDATED,
      metadata: {
        changes,
        timestamp: new Date().toISOString(),
      },
    };

    this.eventsGateway.emitBoxUpdated(event);
    this.logger.log(`Box updated event broadcast: ${boxName}`);
  }

  /**
   * Broadcast box deleted event
   */
  broadcastBoxDeleted(boxId: string, boxName: string, userId: string, userName: string) {
    const event: BoxEventDto = {
      boxId,
      boxName,
      userId,
      userName,
      eventType: EventType.BOX_DELETED,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    this.eventsGateway.emitBoxDeleted(event);
    this.logger.log(`Box deleted event broadcast: ${boxName}`);
  }

  /**
   * Broadcast member added to box
   */
  broadcastBoxMemberAdded(
    boxId: string,
    boxName: string,
    userId: string,
    userName: string,
    newMemberId: string,
    newMemberName: string,
  ) {
    const event: BoxEventDto = {
      boxId,
      boxName,
      userId,
      userName,
      eventType: EventType.BOX_MEMBER_ADDED,
      metadata: {
        newMemberId,
        newMemberName,
        timestamp: new Date().toISOString(),
      },
    };

    this.eventsGateway.emitBoxMemberAdded(event);
    this.logger.log(`Box member added event broadcast: ${newMemberName} added to ${boxName}`);
  }

  /**
   * Broadcast member removed from box
   */
  broadcastBoxMemberRemoved(
    boxId: string,
    boxName: string,
    userId: string,
    userName: string,
    removedMemberId: string,
    removedMemberName: string,
  ) {
    const event: BoxEventDto = {
      boxId,
      boxName,
      userId,
      userName,
      eventType: EventType.BOX_MEMBER_REMOVED,
      metadata: {
        removedMemberId,
        removedMemberName,
        timestamp: new Date().toISOString(),
      },
    };

    this.eventsGateway.emitBoxMemberRemoved(event);
    this.logger.log(`Box member removed event broadcast: ${removedMemberName} removed from ${boxName}`);
  }

  // ============================================
  // Notification Events
  // ============================================

  /**
   * Send notification to user
   */
  sendNotification(userId: string, notification: NotificationDto) {
    this.eventsGateway.emitNotification(userId, notification);
    this.logger.log(`Notification sent to user ${userId}: ${notification.title}`);
  }

  /**
   * Send notification to multiple users
   */
  sendNotificationToUsers(userIds: string[], notification: NotificationDto) {
    userIds.forEach((userId) => {
      this.eventsGateway.emitNotification(userId, notification);
    });
    this.logger.log(`Notification sent to ${userIds.length} users: ${notification.title}`);
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(userId: string, notificationId: string) {
    this.eventsGateway.emitNotificationRead(userId, notificationId);
  }

  // ============================================
  // System Events
  // ============================================

  /**
   * Broadcast system message to all users
   */
  broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info', data?: any) {
    const systemMessage: SystemMessageDto = {
      message,
      type,
      data,
    };

    this.eventsGateway.emitSystemMessage(systemMessage);
    this.logger.log(`System message broadcast: [${type}] ${message}`);
  }

  /**
   * Send system message to specific user
   */
  sendSystemMessageToUser(
    userId: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' = 'info',
    data?: any,
  ) {
    const systemMessage: SystemMessageDto = {
      message,
      type,
      data,
    };

    this.eventsGateway.emitSystemMessageToUser(userId, systemMessage);
    this.logger.log(`System message sent to user ${userId}: [${type}] ${message}`);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get number of connected clients
   */
  getConnectedClientsCount(): number {
    return this.eventsGateway.getConnectedClientsCount();
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.eventsGateway.isUserOnline(userId);
  }

  /**
   * Get online status of multiple users
   */
  getUsersOnlineStatus(userIds: string[]): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    userIds.forEach((userId) => {
      status[userId] = this.eventsGateway.isUserOnline(userId);
    });
    return status;
  }
}
