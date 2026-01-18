import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NoteDocument = Note & Document;

export enum NoteTheme {
  YELLOW = 'yellow',
  GREEN = 'green',
  RED = 'red',
  BLUE = 'blue',
  PURPLE = 'purple',
}

export enum NoteRotation {
  LEFT = 'left',
  RIGHT = 'right',
  NONE = '',
}

@Schema({ _id: false })
export class NoteAuthor {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  email?: string;
}

@Schema({ _id: false })
export class NotePosition {
  @Prop({ type: Number, default: 0 })
  top: number;

  @Prop({ type: Number, default: 0 })
  left: number;
}

@Schema({ collection: 'notes', timestamps: true })
export class Note {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ required: true, index: true })
  box: string; // Box ID this note belongs to

  @Prop({ type: NoteAuthor, required: true })
  author: NoteAuthor;

  @Prop({ type: [String], default: [] })
  files: string[]; // Associated file IDs

  @Prop({ type: [String], default: [] })
  unreadBy: string[]; // User IDs who haven't read this note

  @Prop({ type: String, enum: Object.values(NoteTheme), default: NoteTheme.YELLOW })
  theme: NoteTheme;

  @Prop({ type: String, enum: ['left', 'right', ''], default: '' })
  rotate: NoteRotation;

  @Prop({ required: true })
  text: string; // Note content (supports markdown)

  @Prop({ type: NotePosition, default: { top: 0, left: 0 } })
  position: NotePosition;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const NoteSchema = SchemaFactory.createForClass(Note);

// Indexes for efficient queries
NoteSchema.index({ box: 1, createdAt: -1 });
NoteSchema.index({ 'author.id': 1 });
NoteSchema.index({ unreadBy: 1 });
