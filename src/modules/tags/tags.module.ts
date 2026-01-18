import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { Tag, TagSchema } from './schemas/tag.schema';
import { StorageObject, StorageObjectSchema } from '../files/schemas/file.schema';
import { BoxesModule } from '../boxes/boxes.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tag.name, schema: TagSchema },
      { name: StorageObject.name, schema: StorageObjectSchema },
    ]),
    BoxesModule,
  ],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
