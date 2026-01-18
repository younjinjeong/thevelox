import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  EventType,
  FileUploadProgressDto,
  FileEventDto,
  BoxEventDto,
  UserPresenceDto,
  NotificationDto,
  JoinRoomDto,
  LeaveRoomDto,
  SystemMessageDto,
} from '../dto/realtime.dto';

/**
 * WebSocket Gateway for Real-time Events
 * Handles file uploads, notifications, presence, and collaboration
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedUsers: Map<string, { socketId: string; userId: string; userName: string }> = new Map();
  private userBoxRooms: Map<string, Set<string>> = new Map(); // userId -> Set<boxId>

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract JWT token from handshake
      const token = this.extractTokenFromHandshake(client);

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without authentication token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('app.jwt.secret'),
      });

      const userId = payload.sub;
      const userName = payload.name || payload.email;

      // Store user connection
      this.connectedUsers.set(client.id, { socketId: client.id, userId, userName });

      // Join user's personal room
      client.join(`user:${userId}`);

      this.logger.log(`Client connected: ${client.id} (User: ${userName})`);

      // Broadcast user online status
      this.broadcastUserPresence({
        userId,
        userName,
        status: 'online',
      });

      // Send welcome message
      client.emit('connected', {
        message: 'Successfully connected to Velox real-time server',
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error(`Authentication failed for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userInfo = this.connectedUsers.get(client.id);

    if (userInfo) {
      const { userId, userName } = userInfo;

      // Clean up user's box rooms
      this.userBoxRooms.delete(userId);

      // Remove user connection
      this.connectedUsers.delete(client.id);

      this.logger.log(`Client disconnected: ${client.id} (User: ${userName})`);

      // Broadcast user offline status
      this.broadcastUserPresence({
        userId,
        userName,
        status: 'offline',
      });
    }
  }

  // ============================================
  // Room Management
  // ============================================

  @SubscribeMessage('join:room')
  handleJoinRoom(@MessageBody() data: JoinRoomDto, @ConnectedSocket() client: Socket) {
    const userInfo = this.connectedUsers.get(client.id);

    if (!userInfo) {
      return { error: 'User not authenticated' };
    }

    const roomName = this.getRoomName(data.roomId, data.roomType);
    client.join(roomName);

    // Track box rooms for this user
    if (data.roomType === 'box') {
      if (!this.userBoxRooms.has(userInfo.userId)) {
        this.userBoxRooms.set(userInfo.userId, new Set());
      }
      this.userBoxRooms.get(userInfo.userId).add(data.roomId);
    }

    this.logger.log(`User ${userInfo.userName} joined room: ${roomName}`);

    return { success: true, room: roomName };
  }

  @SubscribeMessage('leave:room')
  handleLeaveRoom(@MessageBody() data: LeaveRoomDto, @ConnectedSocket() client: Socket) {
    const userInfo = this.connectedUsers.get(client.id);

    if (!userInfo) {
      return { error: 'User not authenticated' };
    }

    const roomName = this.getRoomName(data.roomId, 'box');
    client.leave(roomName);

    // Remove from tracked box rooms
    if (this.userBoxRooms.has(userInfo.userId)) {
      this.userBoxRooms.get(userInfo.userId).delete(data.roomId);
    }

    this.logger.log(`User ${userInfo.userName} left room: ${roomName}`);

    return { success: true, room: roomName };
  }

  // ============================================
  // File Events
  // ============================================

  /**
   * Broadcast file upload progress to box members
   */
  emitFileUploadProgress(data: FileUploadProgressDto) {
    const roomName = this.getRoomName(data.boxId, 'box');
    this.server.to(roomName).emit(EventType.FILE_UPLOAD_PROGRESS, data);
  }

  /**
   * Broadcast file uploaded event to box members
   */
  emitFileUploaded(data: FileEventDto) {
    const roomName = this.getRoomName(data.boxId, 'box');
    this.server.to(roomName).emit(EventType.FILE_UPLOADED, data);
    this.logger.log(`File uploaded event sent to room: ${roomName}`);
  }

  /**
   * Broadcast file updated event to box members
   */
  emitFileUpdated(data: FileEventDto) {
    const roomName = this.getRoomName(data.boxId, 'box');
    this.server.to(roomName).emit(EventType.FILE_UPDATED, data);
  }

  /**
   * Broadcast file deleted event to box members
   */
  emitFileDeleted(data: FileEventDto) {
    const roomName = this.getRoomName(data.boxId, 'box');
    this.server.to(roomName).emit(EventType.FILE_DELETED, data);
  }

  // ============================================
  // Box Events
  // ============================================

  /**
   * Broadcast box created event
   */
  emitBoxCreated(data: BoxEventDto) {
    const roomName = this.getRoomName(data.userId, 'user');
    this.server.to(roomName).emit(EventType.BOX_CREATED, data);
  }

  /**
   * Broadcast box updated event to box members
   */
  emitBoxUpdated(data: BoxEventDto) {
    const roomName = this.getRoomName(data.boxId, 'box');
    this.server.to(roomName).emit(EventType.BOX_UPDATED, data);
  }

  /**
   * Broadcast box deleted event to box members
   */
  emitBoxDeleted(data: BoxEventDto) {
    const roomName = this.getRoomName(data.boxId, 'box');
    this.server.to(roomName).emit(EventType.BOX_DELETED, data);
  }

  /**
   * Broadcast member added event
   */
  emitBoxMemberAdded(data: BoxEventDto) {
    const roomName = this.getRoomName(data.boxId, 'box');
    this.server.to(roomName).emit(EventType.BOX_MEMBER_ADDED, data);

    // Also notify the new member directly
    if (data.metadata?.newMemberId) {
      const memberRoom = this.getRoomName(data.metadata.newMemberId, 'user');
      this.server.to(memberRoom).emit(EventType.BOX_MEMBER_ADDED, data);
    }
  }

  /**
   * Broadcast member removed event
   */
  emitBoxMemberRemoved(data: BoxEventDto) {
    const roomName = this.getRoomName(data.boxId, 'box');
    this.server.to(roomName).emit(EventType.BOX_MEMBER_REMOVED, data);
  }

  // ============================================
  // Notification Events
  // ============================================

  /**
   * Send notification to specific user
   */
  emitNotification(userId: string, notification: NotificationDto) {
    const roomName = this.getRoomName(userId, 'user');
    this.server.to(roomName).emit(EventType.NOTIFICATION_NEW, notification);
    this.logger.log(`Notification sent to user: ${userId}`);
  }

  /**
   * Broadcast notification read event
   */
  emitNotificationRead(userId: string, notificationId: string) {
    const roomName = this.getRoomName(userId, 'user');
    this.server.to(roomName).emit(EventType.NOTIFICATION_READ, { notificationId });
  }

  // ============================================
  // Presence Events
  // ============================================

  /**
   * Broadcast user presence to all connected clients
   */
  private broadcastUserPresence(data: UserPresenceDto) {
    this.server.emit(data.status === 'online' ? EventType.USER_ONLINE : EventType.USER_OFFLINE, data);
  }

  /**
   * Get list of online users
   */
  @SubscribeMessage('presence:get')
  handleGetPresence(@ConnectedSocket() client: Socket) {
    const onlineUsers = Array.from(this.connectedUsers.values()).map((user) => ({
      userId: user.userId,
      userName: user.userName,
      status: 'online',
    }));

    return { users: onlineUsers };
  }

  /**
   * Get users in a specific box
   */
  @SubscribeMessage('presence:box')
  handleGetBoxPresence(@MessageBody() data: { boxId: string }, @ConnectedSocket() client: Socket) {
    const roomName = this.getRoomName(data.boxId, 'box');
    const socketsInRoom = this.server.sockets.adapter.rooms.get(roomName);

    if (!socketsInRoom) {
      return { users: [] };
    }

    const users = Array.from(socketsInRoom)
      .map((socketId) => this.connectedUsers.get(socketId))
      .filter((user) => user !== undefined);

    return { users };
  }

  // ============================================
  // Note Events
  // ============================================

  /**
   * Broadcast note created event to box members
   */
  broadcastNoteCreated(boxId: string, note: any) {
    const roomName = this.getRoomName(boxId, 'box');
    this.server.to(roomName).emit(EventType.NOTE_CREATED, note);
    this.logger.log(`Note created event sent to room: ${roomName}`);
  }

  /**
   * Broadcast note updated event to box members
   */
  broadcastNoteUpdated(boxId: string, note: any) {
    const roomName = this.getRoomName(boxId, 'box');
    this.server.to(roomName).emit(EventType.NOTE_UPDATED, note);
    this.logger.log(`Note updated event sent to room: ${roomName}`);
  }

  /**
   * Broadcast note deleted event to box members
   */
  broadcastNoteDeleted(boxId: string, noteId: string) {
    const roomName = this.getRoomName(boxId, 'box');
    this.server.to(roomName).emit(EventType.NOTE_DELETED, { noteId });
    this.logger.log(`Note deleted event sent to room: ${roomName}`);
  }

  /**
   * Broadcast note position changed event to box members
   */
  broadcastNotePositionChanged(boxId: string, data: { id: string; position: { top: number; left: number } }) {
    const roomName = this.getRoomName(boxId, 'box');
    this.server.to(roomName).emit(EventType.NOTE_POSITION_CHANGED, data);
  }

  // ============================================
  // System Events
  // ============================================

  /**
   * Broadcast system message to all connected clients
   */
  emitSystemMessage(message: SystemMessageDto) {
    this.server.emit(EventType.SYSTEM_MESSAGE, message);
    this.logger.log(`System message broadcast: ${message.type} - ${message.message}`);
  }

  /**
   * Send system message to specific user
   */
  emitSystemMessageToUser(userId: string, message: SystemMessageDto) {
    const roomName = this.getRoomName(userId, 'user');
    this.server.to(roomName).emit(EventType.SYSTEM_MESSAGE, message);
  }

  // ============================================
  // Helper Methods
  // ============================================

  private extractTokenFromHandshake(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Also check query parameters for token
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (token && typeof token === 'string') {
      return token;
    }

    return null;
  }

  private getRoomName(id: string, type: 'box' | 'user' | 'global' = 'box'): string {
    switch (type) {
      case 'box':
        return `box:${id}`;
      case 'user':
        return `user:${id}`;
      case 'global':
        return 'global';
      default:
        return id;
    }
  }

  /**
   * Get number of connected clients
   */
  getConnectedClientsCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return Array.from(this.connectedUsers.values()).some((user) => user.userId === userId);
  }
}
