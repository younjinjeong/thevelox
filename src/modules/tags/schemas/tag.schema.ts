import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TagDocument = Tag & Document;

@Schema({ collection: 'tags', timestamps: true })
export class Tag {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ required: true, index: true })
  box: string; // Box ID this tag belongs to

  @Prop({ required: true })
  name: string; // Tag name

  @Prop({ default: '#3B82F6' })
  color: string; // Hex color for the tag

  @Prop({ type: Number, default: 0 })
  count: number; // Number of files with this tag

  @Prop({ required: true })
  createdBy: string; // User ID who created the tag

  @Prop()
  createdByName?: string; // Display name of creator

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const TagSchema = SchemaFactory.createForClass(Tag);

// Indexes for efficient queries
TagSchema.index({ box: 1, name: 1 }, { unique: true });
TagSchema.index({ box: 1, createdAt: -1 });
