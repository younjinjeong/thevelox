import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { MarkAsReadDto, NotificationQueryDto, NotificationResponseDto, NotificationStatsDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully', type: [NotificationResponseDto] })
  async findAll(@Query() query: NotificationQueryDto, @Request() req) {
    const { notifications, total } = await this.notificationsService.findByUser(req.user.userId, query);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      notifications: notifications.map((n) => this.mapToResponseDto(n)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully', type: NotificationStatsDto })
  async getStats(@Request() req): Promise<NotificationStatsDto> {
    return this.notificationsService.getStats(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification retrieved successfully', type: NotificationResponseDto })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(@Param('id') id: string): Promise<NotificationResponseDto> {
    const notification = await this.notificationsService.findById(id);
    return this.mapToResponseDto(notification);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read', type: NotificationResponseDto })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id') id: string, @Request() req): Promise<NotificationResponseDto> {
    const notification = await this.notificationsService.markAsRead(id, req.user.userId);
    return this.mapToResponseDto(notification);
  }

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark multiple notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  async markMultipleAsRead(@Body() dto: MarkAsReadDto, @Request() req) {
    const count = await this.notificationsService.markMultipleAsRead(dto.notificationIds, req.user.userId);
    return { count, message: `${count} notifications marked as read` };
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req) {
    const count = await this.notificationsService.markAllAsRead(req.user.userId);
    return { count, message: `All ${count} notifications marked as read` };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 204, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async delete(@Param('id') id: string, @Request() req): Promise<void> {
    await this.notificationsService.delete(id, req.user.userId);
  }

  @Post('delete-multiple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete multiple notifications' })
  @ApiResponse({ status: 200, description: 'Notifications deleted successfully' })
  async deleteMultiple(@Body() dto: MarkAsReadDto, @Request() req) {
    const count = await this.notificationsService.deleteMultiple(dto.notificationIds, req.user.userId);
    return { count, message: `${count} notifications deleted` };
  }

  // ============================================
  // Helper methods
  // ============================================

  private mapToResponseDto(notification: any): NotificationResponseDto {
    return {
      id: notification._id.toString(),
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedEntityId: notification.relatedEntityId,
      relatedEntityType: notification.relatedEntityType,
      data: notification.data,
      actorId: notification.actorId,
      actorName: notification.actorName,
      read: notification.read,
      readAt: notification.readAt,
      actionUrl: notification.actionUrl,
      actionText: notification.actionText,
      createdAt: notification.createdAt,
      isRecent: notification.isRecent,
    };
  }
}
