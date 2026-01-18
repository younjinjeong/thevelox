import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoxesController } from './boxes.controller';
import { BoxesService } from './boxes.service';
import { Box, BoxSchema } from './schemas/box.schema';
import { StorageObject, StorageObjectSchema } from '../files/schemas/file.schema';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Box.name, schema: BoxSchema },
      { name: StorageObject.name, schema: StorageObjectSchema },
    ]),
    StorageModule,
    UsersModule,
    RealtimeModule,
  ],
  controllers: [BoxesController],
  providers: [BoxesService],
  exports: [BoxesService],
})
export class BoxesModule {}
