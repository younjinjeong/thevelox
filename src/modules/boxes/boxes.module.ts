import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoxesController } from './boxes.controller';
import { BoxesService } from './boxes.service';
import { Box, BoxSchema } from './schemas/box.schema';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Box.name, schema: BoxSchema }]),
    StorageModule,
    UsersModule,
  ],
  controllers: [BoxesController],
  providers: [BoxesService],
  exports: [BoxesService],
})
export class BoxesModule {}
