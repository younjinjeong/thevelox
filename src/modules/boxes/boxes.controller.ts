import {
  Controller,
  Get,
  Post,
  Put,
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
import { BoxesService } from './boxes.service';
import {
  CreateBoxDto,
  UpdateBoxDto,
  AddMembersDto,
  RemoveMemberDto,
  CheckBoxNameDto,
  ShareBoxDto,
  BulkBoxIdsDto,
  BoxResponseDto,
} from './dto/box.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('boxes')
@Controller('boxes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BoxesController {
  constructor(private readonly boxesService: BoxesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new box' })
  @ApiResponse({ status: 201, description: 'Box created successfully', type: BoxResponseDto })
  @ApiResponse({ status: 409, description: 'Box name already exists' })
  async create(@Body() createBoxDto: CreateBoxDto, @Request() req) {
    const box = await this.boxesService.create(createBoxDto, req.user.userId);
    return this.mapToResponseDto(box);
  }

  @Get()
  @ApiOperation({ summary: 'Get all boxes for current user (owner or member)' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean, description: 'Include archived boxes' })
  @ApiResponse({ status: 200, description: 'Boxes retrieved successfully', type: [BoxResponseDto] })
  async findAll(@Request() req, @Query('includeArchived') includeArchived?: boolean) {
    const boxes = await this.boxesService.findByUser(req.user.userId, includeArchived === true);
    return boxes.map((box) => this.mapToResponseDto(box));
  }

  @Get('my-boxes')
  @ApiOperation({ summary: 'Get boxes owned by current user' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean, description: 'Include archived boxes' })
  @ApiResponse({ status: 200, description: 'Boxes retrieved successfully', type: [BoxResponseDto] })
  async findMyBoxes(@Request() req, @Query('includeArchived') includeArchived?: boolean) {
    const boxes = await this.boxesService.findByOwner(req.user.userId, includeArchived === true);
    return boxes.map((box) => this.mapToResponseDto(box));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a box by ID' })
  @ApiParam({ name: 'id', description: 'Box ID' })
  @ApiResponse({ status: 200, description: 'Box retrieved successfully', type: BoxResponseDto })
  @ApiResponse({ status: 404, description: 'Box not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Param('id') id: string, @Request() req) {
    const box = await this.boxesService.findOneByAuth(id, req.user.userId);
    return this.mapToResponseDto(box);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a box' })
  @ApiParam({ name: 'id', description: 'Box ID' })
  @ApiResponse({ status: 200, description: 'Box updated successfully', type: BoxResponseDto })
  @ApiResponse({ status: 404, description: 'Box not found' })
  @ApiResponse({ status: 403, description: 'Only owner can update' })
  async update(@Param('id') id: string, @Body() updateBoxDto: UpdateBoxDto, @Request() req) {
    const box = await this.boxesService.update(id, updateBoxDto, req.user.userId);
    return this.mapToResponseDto(box);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add members to a box' })
  @ApiParam({ name: 'id', description: 'Box ID' })
  @ApiResponse({ status: 200, description: 'Members added successfully', type: BoxResponseDto })
  @ApiResponse({ status: 404, description: 'Box or user not found' })
  @ApiResponse({ status: 403, description: 'Only owner can add members' })
  async addMembers(@Param('id') id: string, @Body() addMembersDto: AddMembersDto, @Request() req) {
    const box = await this.boxesService.addMembers(id, addMembersDto, req.user.userId);
    return this.mapToResponseDto(box);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from a box' })
  @ApiParam({ name: 'id', description: 'Box ID' })
  @ApiParam({ name: 'memberId', description: 'Member user ID to remove' })
  @ApiResponse({ status: 200, description: 'Member removed successfully', type: BoxResponseDto })
  @ApiResponse({ status: 404, description: 'Box not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req) {
    const box = await this.boxesService.removeMember(id, memberId, req.user.userId);
    return this.mapToResponseDto(box);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share a box with users' })
  @ApiParam({ name: 'id', description: 'Box ID' })
  @ApiResponse({ status: 200, description: 'Box shared successfully', type: BoxResponseDto })
  @ApiResponse({ status: 404, description: 'Box not found' })
  @ApiResponse({ status: 403, description: 'Only owner can share' })
  async shareBox(@Param('id') id: string, @Body() shareBoxDto: ShareBoxDto, @Request() req) {
    const box = await this.boxesService.shareBox(id, shareBoxDto, req.user.userId);
    return this.mapToResponseDto(box);
  }

  @Post(':id/close-sharing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close/disable sharing for a box' })
  @ApiParam({ name: 'id', description: 'Box ID' })
  @ApiResponse({ status: 200, description: 'Sharing closed successfully', type: BoxResponseDto })
  @ApiResponse({ status: 404, description: 'Box not found' })
  @ApiResponse({ status: 403, description: 'Only owner can close sharing' })
  async closeSharing(@Param('id') id: string, @Request() req) {
    const box = await this.boxesService.closeSharing(id, req.user.userId);
    return this.mapToResponseDto(box);
  }

  @Post('check-name')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if box name is available' })
  @ApiResponse({ status: 200, description: 'Name availability checked', schema: { properties: { available: { type: 'boolean' } } } })
  async checkName(@Body() checkBoxNameDto: CheckBoxNameDto, @Request() req) {
    const available = await this.boxesService.isNameAvailable(req.user.userId, checkBoxNameDto.boxname);
    return { available, message: available ? 'Available' : 'Duplicated' };
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive (soft delete) a box' })
  @ApiParam({ name: 'id', description: 'Box ID' })
  @ApiResponse({ status: 200, description: 'Box archived successfully', type: BoxResponseDto })
  @ApiResponse({ status: 404, description: 'Box not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async archive(@Param('id') id: string, @Request() req) {
    const box = await this.boxesService.archive(id, req.user.userId);
    return this.mapToResponseDto(box);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore an archived box' })
  @ApiParam({ name: 'id', description: 'Box ID' })
  @ApiResponse({ status: 200, description: 'Box restored successfully', type: BoxResponseDto })
  @ApiResponse({ status: 404, description: 'Box not found' })
  @ApiResponse({ status: 403, description: 'Only owner can restore' })
  async restore(@Param('id') id: string, @Request() req) {
    const box = await this.boxesService.restore(id, req.user.userId);
    return this.mapToResponseDto(box);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a box' })
  @ApiParam({ name: 'id', description: 'Box ID' })
  @ApiResponse({ status: 204, description: 'Box deleted successfully' })
  @ApiResponse({ status: 404, description: 'Box not found' })
  @ApiResponse({ status: 403, description: 'Only owner can delete' })
  async delete(@Param('id') id: string, @Request() req) {
    await this.boxesService.delete(id, req.user.userId);
  }

  @Post('bulk-archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive multiple boxes' })
  @ApiResponse({ status: 200, description: 'Boxes archived successfully', schema: { properties: { count: { type: 'number' } } } })
  async bulkArchive(@Body() bulkBoxIdsDto: BulkBoxIdsDto, @Request() req) {
    const count = await this.boxesService.bulkArchive(bulkBoxIdsDto.ids, req.user.userId);
    return { count, message: `${count} boxes archived successfully` };
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore multiple boxes' })
  @ApiResponse({ status: 200, description: 'Boxes restored successfully', schema: { properties: { count: { type: 'number' } } } })
  async bulkRestore(@Body() bulkBoxIdsDto: BulkBoxIdsDto, @Request() req) {
    const count = await this.boxesService.bulkRestore(bulkBoxIdsDto.ids, req.user.userId);
    return { count, message: `${count} boxes restored successfully` };
  }

  // ============================================
  // Helper methods
  // ============================================

  private mapToResponseDto(box: any): BoxResponseDto {
    return {
      id: box._id.toString(),
      name: box.name,
      description: box.description,
      owner: box.owner,
      members: box.members,
      type: box.type,
      status: box.status,
      size: box.size,
      sizeFormatted: box.sizeFormatted,
      fileLength: box.fileLength,
      tags: box.tags,
      linkInfo: box.linkInfo,
      createDate: box.createDate,
      lastModifyDate: box.lastModifyDate,
      isShared: box.isShared,
      isPublic: box.isPublic,
    };
  }
}
