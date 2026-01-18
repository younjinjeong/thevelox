import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotesService } from './notes.service';
import {
  CreateNoteDto,
  UpdateNoteDto,
  UpdateNotePositionDto,
  NoteResponseDto,
} from './dto/note.dto';

@ApiTags('Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get('box/:boxId')
  @ApiOperation({ summary: 'Get all notes in a box' })
  @ApiResponse({ status: 200, description: 'Returns all notes in the box', type: [NoteResponseDto] })
  async findAllByBox(
    @Param('boxId') boxId: string,
    @Request() req,
  ): Promise<NoteResponseDto[]> {
    return this.notesService.findAllByBox(boxId, req.user.userId);
  }

  @Post('box/:boxId')
  @ApiOperation({ summary: 'Create a new note in a box' })
  @ApiResponse({ status: 201, description: 'Note created successfully', type: NoteResponseDto })
  async create(
    @Param('boxId') boxId: string,
    @Body() createNoteDto: CreateNoteDto,
    @Request() req,
  ): Promise<NoteResponseDto> {
    return this.notesService.create(
      boxId,
      createNoteDto,
      req.user.userId,
      req.user.name,
      req.user.email,
    );
  }

  @Get('box/:boxId/unread-count')
  @ApiOperation({ summary: 'Get unread notes count for a box' })
  @ApiResponse({ status: 200, description: 'Returns unread count' })
  async getUnreadCount(
    @Param('boxId') boxId: string,
    @Request() req,
  ): Promise<{ count: number }> {
    const count = await this.notesService.getUnreadCount(boxId, req.user.userId);
    return { count };
  }

  @Post('box/:boxId/mark-all-read')
  @ApiOperation({ summary: 'Mark all notes in a box as read' })
  @ApiResponse({ status: 200, description: 'Notes marked as read' })
  async markAllAsRead(
    @Param('boxId') boxId: string,
    @Request() req,
  ): Promise<{ updated: number }> {
    return this.notesService.markAllAsRead(boxId, req.user.userId);
  }

  @Get(':noteId')
  @ApiOperation({ summary: 'Get a note by ID' })
  @ApiResponse({ status: 200, description: 'Returns the note', type: NoteResponseDto })
  async findById(
    @Param('noteId') noteId: string,
    @Request() req,
  ): Promise<NoteResponseDto> {
    return this.notesService.findById(noteId, req.user.userId);
  }

  @Put(':noteId')
  @ApiOperation({ summary: 'Update a note' })
  @ApiResponse({ status: 200, description: 'Note updated successfully', type: NoteResponseDto })
  async update(
    @Param('noteId') noteId: string,
    @Body() updateNoteDto: UpdateNoteDto,
    @Request() req,
  ): Promise<NoteResponseDto> {
    return this.notesService.update(noteId, updateNoteDto, req.user.userId);
  }

  @Patch(':noteId/position')
  @ApiOperation({ summary: 'Update note position' })
  @ApiResponse({ status: 200, description: 'Position updated successfully', type: NoteResponseDto })
  async updatePosition(
    @Param('noteId') noteId: string,
    @Body() updatePositionDto: UpdateNotePositionDto,
    @Request() req,
  ): Promise<NoteResponseDto> {
    return this.notesService.updatePosition(noteId, updatePositionDto, req.user.userId);
  }

  @Post(':noteId/read')
  @ApiOperation({ summary: 'Mark a note as read' })
  @ApiResponse({ status: 200, description: 'Note marked as read', type: NoteResponseDto })
  async markAsRead(
    @Param('noteId') noteId: string,
    @Request() req,
  ): Promise<NoteResponseDto> {
    return this.notesService.markAsRead(noteId, req.user.userId);
  }

  @Delete(':noteId')
  @ApiOperation({ summary: 'Delete a note' })
  @ApiResponse({ status: 200, description: 'Note deleted successfully' })
  async delete(
    @Param('noteId') noteId: string,
    @Request() req,
  ): Promise<void> {
    return this.notesService.delete(noteId, req.user.userId);
  }
}
