import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import {
  SystemSettings,
  SystemSettingsSchema,
} from './schemas/system-settings.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: SystemSettings.name, schema: SystemSettingsSchema },
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
