import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StorageObject, StorageObjectSchema } from './schemas/file.schema';
import { StorageModule } from '../storage/storage.module';
import { BoxesModule } from '../boxes/boxes.module';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: StorageObject.name, schema: StorageObjectSchema }]),
    StorageModule,
    BoxesModule,
    UsersModule,
    RealtimeModule,
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
