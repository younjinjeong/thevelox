import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService } from '../users/users.service';
import {
  AdminResetPasswordDto,
  AdminUpdateUserDto,
  AdminCreateUserDto,
} from './dto/admin-user.dto';

@ApiTags('admin/users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name or email' })
  @ApiQuery({ name: 'status', required: false, enum: [1, 2], description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'Returns paginated user list' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.findAllAdmin(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
      status ? parseInt(status, 10) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details' })
  @ApiResponse({ status: 200, description: 'Returns user details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createUser(@Body() dto: AdminCreateUserDto) {
    return this.usersService.adminCreate(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (admin)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.usersService.adminUpdate(id, dto);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Reset user password (admin override)' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    await this.usersService.adminResetPassword(id, dto.newPassword);
    return { message: 'Password reset successfully' };
  }

  @Post(':id/enable')
  @ApiOperation({ summary: 'Enable user account' })
  @ApiResponse({ status: 200, description: 'User enabled successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async enableUser(@Param('id') id: string) {
    await this.usersService.restore(id);
    return { message: 'User enabled successfully' };
  }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Disable user account' })
  @ApiResponse({ status: 200, description: 'User disabled successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async disableUser(@Param('id') id: string) {
    await this.usersService.softDelete(id);
    return { message: 'User disabled successfully' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user permanently' })
  @ApiResponse({ status: 200, description: 'User deleted permanently' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async deleteUser(@Param('id') id: string) {
    await this.usersService.hardDelete(id);
    return { message: 'User deleted permanently' };
  }
}
