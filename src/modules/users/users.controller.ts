import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  UpdateUserDto,
  UpdateUserPreferencesDto,
  UpdateUserNotificationsDto,
  ChangePasswordDto,
} from './dto/update-user.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.usersService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updatePreferences(
    @Param('id') id: string,
    @Body() preferences: UpdateUserPreferencesDto,
  ) {
    return this.usersService.updatePreferences(id, preferences);
  }

  @Patch(':id/notifications')
  @ApiOperation({ summary: 'Update user notification settings' })
  @ApiResponse({ status: 200, description: 'Notifications updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateNotifications(
    @Param('id') id: string,
    @Body() notifications: UpdateUserNotificationsDto,
  ) {
    return this.usersService.updateNotifications(id, notifications);
  }

  @Post(':id/change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Current password is incorrect' })
  async changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
    await this.usersService.changePassword(id, dto.currentPassword, dto.newPassword);
    return { message: 'Password changed successfully' };
  }

  @Get(':id/storage')
  @ApiOperation({ summary: 'Get user storage statistics' })
  @ApiResponse({ status: 200, description: 'Storage stats retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getStorageStats(@Param('id') id: string) {
    return this.usersService.getStorageStats(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete user (set status to inactive)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async softDelete(@Param('id') id: string) {
    await this.usersService.softDelete(id);
    return { message: 'User deleted successfully' };
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore soft deleted user' })
  @ApiResponse({ status: 200, description: 'User restored successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async restore(@Param('id') id: string) {
    await this.usersService.restore(id);
    return { message: 'User restored successfully' };
  }
}
