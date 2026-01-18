import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ShareLink, ShareLinkDocument } from './schemas/share-link.schema';
import { StorageObject } from './schemas/file.schema';
import {
  CreateShareLinkDto,
  ShareLinkResponseDto,
  PublicFileResponseDto,
} from './dto/share-link.dto';
import { BoxesService } from '../boxes/boxes.service';

@Injectable()
export class ShareLinksService {
  constructor(
    @InjectModel(ShareLink.name)
    private shareLinkModel: Model<ShareLinkDocument>,
    @InjectModel(StorageObject.name)
    private fileModel: Model<StorageObject>,
    private boxesService: BoxesService,
    private configService: ConfigService,
  ) {}

  private getBaseUrl(): string {
    return this.configService.get<string>('APP_URL') || 'http://localhost:3000';
  }

  async create(
    fileId: string,
    createDto: CreateShareLinkDto,
    userId: string,
    userName: string,
  ): Promise<ShareLinkResponseDto> {
    // Find the file
    const file = await this.fileModel.findById(fileId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Verify user has access to the box
    await this.boxesService.findOneByAuth(file.box, userId);

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (createDto.password) {
      hashedPassword = await bcrypt.hash(createDto.password, 10);
    }

    const shareLink = new this.shareLinkModel({
      file: fileId,
      createdBy: userId,
      createdByName: userName,
      expiresAt: createDto.expiresAt,
      password: hashedPassword,
      downloadLimit: createDto.downloadLimit || 0,
    });

    const savedLink = await shareLink.save();
    return this.toResponseDto(savedLink);
  }

  async findByFile(fileId: string, userId: string): Promise<ShareLinkResponseDto[]> {
    // Find the file
    const file = await this.fileModel.findById(fileId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Verify user has access to the box
    await this.boxesService.findOneByAuth(file.box, userId);

    const links = await this.shareLinkModel
      .find({ file: fileId, isActive: true })
      .sort({ createdAt: -1 });

    return links.map((link) => this.toResponseDto(link));
  }

  async delete(linkId: string, userId: string): Promise<void> {
    const link = await this.shareLinkModel.findById(linkId);
    if (!link) {
      throw new NotFoundException('Share link not found');
    }

    // Find the file to verify access
    const file = await this.fileModel.findById(link.file);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Verify user has access to the box
    await this.boxesService.findOneByAuth(file.box, userId);

    // Only creator or box owner can delete
    const box = await this.boxesService.findOneByAuth(file.box, userId);
    if (link.createdBy !== userId && box.owner !== userId) {
      throw new ForbiddenException('Only the creator or box owner can delete this link');
    }

    await this.shareLinkModel.findByIdAndDelete(linkId);
  }

  async deactivate(linkId: string, userId: string): Promise<ShareLinkResponseDto> {
    const link = await this.shareLinkModel.findById(linkId);
    if (!link) {
      throw new NotFoundException('Share link not found');
    }

    // Find the file to verify access
    const file = await this.fileModel.findById(link.file);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Verify user has access to the box
    await this.boxesService.findOneByAuth(file.box, userId);

    link.isActive = false;
    const updatedLink = await link.save();
    return this.toResponseDto(updatedLink);
  }

  // Public methods (no auth required)

  async getPublicFileInfo(token: string): Promise<PublicFileResponseDto> {
    const link = await this.shareLinkModel.findOne({ token, isActive: true });
    if (!link) {
      throw new NotFoundException('Share link not found or expired');
    }

    // Check if expired
    if (link.expiresAt && new Date() > link.expiresAt) {
      throw new BadRequestException('Share link has expired');
    }

    // Check download limit
    if (link.downloadLimit > 0 && link.downloadCount >= link.downloadLimit) {
      throw new BadRequestException('Download limit reached');
    }

    const file = await this.fileModel.findById(link.file);
    if (!file || file.status !== 1) {
      throw new NotFoundException('File not found');
    }

    return {
      id: file._id.toString(),
      name: file.name,
      mimetype: file.mime,
      size: file.size,
      hasPassword: !!link.password,
    };
  }

  async validateAndGetFile(
    token: string,
    password?: string,
  ): Promise<{ file: StorageObject; link: ShareLinkDocument }> {
    const link = await this.shareLinkModel.findOne({ token, isActive: true });
    if (!link) {
      throw new NotFoundException('Share link not found or expired');
    }

    // Check if expired
    if (link.expiresAt && new Date() > link.expiresAt) {
      throw new BadRequestException('Share link has expired');
    }

    // Check download limit
    if (link.downloadLimit > 0 && link.downloadCount >= link.downloadLimit) {
      throw new BadRequestException('Download limit reached');
    }

    // Verify password if set
    if (link.password) {
      if (!password) {
        throw new UnauthorizedException('Password required');
      }
      const isValid = await bcrypt.compare(password, link.password);
      if (!isValid) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    const file = await this.fileModel.findById(link.file);
    if (!file || file.status !== 1) {
      throw new NotFoundException('File not found');
    }

    return { file, link };
  }

  async incrementDownloadCount(linkId: string): Promise<void> {
    await this.shareLinkModel.findByIdAndUpdate(linkId, {
      $inc: { downloadCount: 1 },
    });
  }

  private toResponseDto(link: ShareLinkDocument): ShareLinkResponseDto {
    const baseUrl = this.getBaseUrl();
    return {
      id: link._id.toString(),
      file: link.file,
      token: link.token,
      url: `${baseUrl}/share/${link.token}`,
      createdBy: link.createdBy,
      createdByName: link.createdByName,
      expiresAt: link.expiresAt,
      hasPassword: !!link.password,
      downloadLimit: link.downloadLimit,
      downloadCount: link.downloadCount,
      isActive: link.isActive,
      createdAt: link.createdAt,
    };
  }
}
