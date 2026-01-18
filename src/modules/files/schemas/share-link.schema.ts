import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type ShareLinkDocument = ShareLink & Document;

@Schema({ timestamps: true })
export class ShareLink {
  @Prop({ required: true, index: true })
  file: string;

  @Prop({ required: true, unique: true, default: () => uuidv4() })
  token: string;

  @Prop({ required: true })
  createdBy: string;

  @Prop()
  createdByName: string;

  @Prop()
  expiresAt?: Date;

  @Prop()
  password?: string;

  @Prop({ default: 0 })
  downloadLimit: number;

  @Prop({ default: 0 })
  downloadCount: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ShareLinkSchema = SchemaFactory.createForClass(ShareLink);

// Index for token lookup
ShareLinkSchema.index({ token: 1 });

// Index for file lookup
ShareLinkSchema.index({ file: 1 });

// TTL index for auto-expiration
ShareLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });
