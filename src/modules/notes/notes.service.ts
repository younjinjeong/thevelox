import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note, NoteDocument, NoteTheme } from './schemas/note.schema';
import {
  CreateNoteDto,
  UpdateNoteDto,
  UpdateNotePositionDto,
  NoteResponseDto,
} from './dto/note.dto';
import { BoxesService } from '../boxes/boxes.service';
import { EventsGateway } from '../realtime/gateways/events.gateway';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
    private boxesService: BoxesService,
    private eventsGateway: EventsGateway,
  ) {}

  async create(
    boxId: string,
    createNoteDto: CreateNoteDto,
    userId: string,
    userName: string,
    userEmail?: string,
  ): Promise<NoteResponseDto> {
    // Verify box exists and user has access
    const box = await this.boxesService.findOneByAuth(boxId, userId);

    // Get all box members for unreadBy (excluding the creator)
    // box.members is string[] (user IDs)
    const unreadBy = [box.owner, ...box.members]
      .filter(id => id !== userId);

    // Apply random rotation if not specified
    const rotations = ['left', 'right', ''];
    const randomRotation = rotations[Math.floor(Math.random() * rotations.length)];

    const note = new this.noteModel({
      box: boxId,
      author: {
        id: userId,
        name: userName,
        email: userEmail,
      },
      text: createNoteDto.text,
      theme: createNoteDto.theme || NoteTheme.YELLOW,
      rotate: createNoteDto.rotate ?? randomRotation,
      position: createNoteDto.position || { top: 0, left: 0 },
      files: createNoteDto.files || [],
      unreadBy,
    });

    const savedNote = await note.save();
    const responseDto = this.toResponseDto(savedNote, userId);

    // Emit WebSocket event
    this.eventsGateway.broadcastNoteCreated(boxId, responseDto);

    return responseDto;
  }

  async findAllByBox(boxId: string, userId: string): Promise<NoteResponseDto[]> {
    // Verify box exists and user has access
    await this.boxesService.findOneByAuth(boxId, userId);

    const notes = await this.noteModel.find({ box: boxId }).sort({ createdAt: -1 });
    return notes.map((note) => this.toResponseDto(note, userId));
  }

  async findById(noteId: string, userId: string): Promise<NoteResponseDto> {
    const note = await this.noteModel.findById(noteId);
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Verify user has access to the box
    await this.boxesService.findOneByAuth(note.box, userId);

    return this.toResponseDto(note, userId);
  }

  async update(
    noteId: string,
    updateNoteDto: UpdateNoteDto,
    userId: string,
  ): Promise<NoteResponseDto> {
    const note = await this.noteModel.findById(noteId);
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Verify user has access to the box
    await this.boxesService.findOneByAuth(note.box, userId);

    // Only author can update the note content
    if (note.author.id !== userId && updateNoteDto.text) {
      throw new ForbiddenException('Only the author can update note content');
    }

    Object.assign(note, updateNoteDto);
    const updatedNote = await note.save();
    const responseDto = this.toResponseDto(updatedNote, userId);

    // Emit WebSocket event
    this.eventsGateway.broadcastNoteUpdated(note.box, responseDto);

    return responseDto;
  }

  async updatePosition(
    noteId: string,
    updatePositionDto: UpdateNotePositionDto,
    userId: string,
  ): Promise<NoteResponseDto> {
    const note = await this.noteModel.findById(noteId);
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Verify user has access to the box
    await this.boxesService.findOneByAuth(note.box, userId);

    note.position = updatePositionDto.position;
    const updatedNote = await note.save();
    const responseDto = this.toResponseDto(updatedNote, userId);

    // Emit WebSocket event for position change
    this.eventsGateway.broadcastNotePositionChanged(note.box, {
      id: noteId,
      position: updatePositionDto.position,
    });

    return responseDto;
  }

  async delete(noteId: string, userId: string): Promise<void> {
    const note = await this.noteModel.findById(noteId);
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Verify user has access to the box
    const box = await this.boxesService.findOneByAuth(note.box, userId);

    // Only author or box owner can delete
    if (note.author.id !== userId && box.owner !== userId) {
      throw new ForbiddenException('Only the author or box owner can delete this note');
    }

    const boxId = note.box;
    await this.noteModel.findByIdAndDelete(noteId);

    // Emit WebSocket event
    this.eventsGateway.broadcastNoteDeleted(boxId, noteId);
  }

  async markAsRead(noteId: string, userId: string): Promise<NoteResponseDto> {
    const note = await this.noteModel.findById(noteId);
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Verify user has access to the box
    await this.boxesService.findOneByAuth(note.box, userId);

    // Remove user from unreadBy array
    await this.noteModel.findByIdAndUpdate(noteId, {
      $pull: { unreadBy: userId },
    });

    const updatedNote = await this.noteModel.findById(noteId);
    return this.toResponseDto(updatedNote!, userId);
  }

  async markAllAsRead(boxId: string, userId: string): Promise<{ updated: number }> {
    // Verify box exists and user has access
    await this.boxesService.findOneByAuth(boxId, userId);

    const result = await this.noteModel.updateMany(
      { box: boxId, unreadBy: userId },
      { $pull: { unreadBy: userId } },
    );

    return { updated: result.modifiedCount };
  }

  async getUnreadCount(boxId: string, userId: string): Promise<number> {
    // Verify box exists and user has access
    await this.boxesService.findOneByAuth(boxId, userId);

    return this.noteModel.countDocuments({ box: boxId, unreadBy: userId });
  }

  private toResponseDto(note: NoteDocument, userId: string): NoteResponseDto {
    return {
      id: note._id.toString(),
      box: note.box,
      author: {
        id: note.author.id,
        name: note.author.name,
        email: note.author.email,
      },
      files: note.files,
      isUnread: note.unreadBy.includes(userId),
      theme: note.theme,
      rotate: note.rotate,
      text: note.text,
      position: {
        top: note.position.top,
        left: note.position.left,
      },
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }
}
