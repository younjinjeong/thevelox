import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { ShareLinksController } from './share-links.controller';
import { ShareLinksService } from './share-links.service';
import { StorageObject, StorageObjectSchema } from './schemas/file.schema';
import { ShareLink, ShareLinkSchema } from './schemas/share-link.schema';
import { StorageModule } from '../storage/storage.module';
import { BoxesModule } from '../boxes/boxes.module';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StorageObject.name, schema: StorageObjectSchema },
      { name: ShareLink.name, schema: ShareLinkSchema },
    ]),
    StorageModule,
    BoxesModule,
    UsersModule,
    RealtimeModule,
  ],
  controllers: [FilesController, ShareLinksController],
  providers: [FilesService, ShareLinksService],
  exports: [FilesService, ShareLinksService],
})
export class FilesModule {}
