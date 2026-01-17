import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import {
  UpdateStorageSettingsDto,
  TestStorageConnectionDto,
  StorageSettingsResponseDto,
} from './dto/storage-settings.dto';

@ApiTags('admin/settings')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({ status: 200, description: 'Returns system settings' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Get('storage')
  @ApiOperation({ summary: 'Get storage provider settings' })
  @ApiResponse({
    status: 200,
    description: 'Returns storage settings with masked secrets',
    type: StorageSettingsResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getStorageSettings(): Promise<StorageSettingsResponseDto> {
    return this.settingsService.getStorageSettings();
  }

  @Put('storage')
  @ApiOperation({ summary: 'Update storage provider settings' })
  @ApiResponse({
    status: 200,
    description: 'Storage settings updated successfully',
    type: StorageSettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid settings' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async updateStorageSettings(
    @Body() dto: UpdateStorageSettingsDto,
    @Request() req,
  ): Promise<StorageSettingsResponseDto> {
    return this.settingsService.updateStorageSettings(dto, req.user.userId);
  }

  @Post('storage/test')
  @ApiOperation({ summary: 'Test storage provider connection' })
  @ApiResponse({
    status: 200,
    description: 'Connection test result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid settings' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async testStorageConnection(
    @Body() dto: TestStorageConnectionDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.settingsService.testStorageConnection(dto);
  }
}
