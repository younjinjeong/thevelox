import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShareLinksService } from './share-links.service';
import { FilesService } from './files.service';
import {
  CreateShareLinkDto,
  AccessShareLinkDto,
  ShareLinkResponseDto,
  PublicFileResponseDto,
} from './dto/share-link.dto';

@ApiTags('Share Links')
@Controller()
export class ShareLinksController {
  constructor(
    private shareLinksService: ShareLinksService,
    private filesService: FilesService,
  ) {}

  // Authenticated endpoints
  @Post('files/:fileId/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create share link for a file' })
  @ApiResponse({ status: 201, type: ShareLinkResponseDto })
  async createShareLink(
    @Param('fileId') fileId: string,
    @Body() createDto: CreateShareLinkDto,
    @Request() req: any,
  ): Promise<ShareLinkResponseDto> {
    const user = req.user;
    return this.shareLinksService.create(
      fileId,
      createDto,
      user._id.toString(),
      user.name,
    );
  }

  @Get('files/:fileId/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get share links for a file' })
  @ApiResponse({ status: 200, type: [ShareLinkResponseDto] })
  async getShareLinks(
    @Param('fileId') fileId: string,
    @Request() req: any,
  ): Promise<ShareLinkResponseDto[]> {
    const user = req.user;
    return this.shareLinksService.findByFile(fileId, user._id.toString());
  }

  @Delete('files/:fileId/share/:linkId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete share link' })
  @ApiResponse({ status: 204 })
  async deleteShareLink(
    @Param('linkId') linkId: string,
    @Request() req: any,
  ): Promise<void> {
    const user = req.user;
    return this.shareLinksService.delete(linkId, user._id.toString());
  }

  // Public endpoints (no auth required)
  @Get('public/share/:token')
  @ApiOperation({ summary: 'Get shared file info (public)' })
  @ApiResponse({ status: 200, type: PublicFileResponseDto })
  async getPublicFileInfo(
    @Param('token') token: string,
  ): Promise<PublicFileResponseDto> {
    return this.shareLinksService.getPublicFileInfo(token);
  }

  @Get('public/share/:token/download')
  @ApiOperation({ summary: 'Download shared file (public)' })
  async downloadSharedFile(
    @Param('token') token: string,
    @Query('password') password?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const { file, link } = await this.shareLinksService.validateAndGetFile(
      token,
      password,
    );

    // Get download stream
    const stream = await this.filesService.getDownloadStreamPublic(
      file._id.toString(),
    );

    // Increment download count
    await this.shareLinksService.incrementDownloadCount(link._id.toString());

    // Set response headers
    res.setHeader('Content-Type', file.mime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.name)}"`,
    );
    res.setHeader('Content-Length', file.size);

    // Pipe the stream
    stream.pipe(res);
  }

  @Post('public/share/:token/download')
  @ApiOperation({ summary: 'Download shared file with password (public)' })
  async downloadSharedFileWithPassword(
    @Param('token') token: string,
    @Body() accessDto: AccessShareLinkDto,
    @Res() res: Response,
  ): Promise<void> {
    const { file, link } = await this.shareLinksService.validateAndGetFile(
      token,
      accessDto.password,
    );

    // Get download stream
    const stream = await this.filesService.getDownloadStreamPublic(
      file._id.toString(),
    );

    // Increment download count
    await this.shareLinksService.incrementDownloadCount(link._id.toString());

    // Set response headers
    res.setHeader('Content-Type', file.mime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.name)}"`,
    );
    res.setHeader('Content-Length', file.size);

    // Pipe the stream
    stream.pipe(res);
  }
}
