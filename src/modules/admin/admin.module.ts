import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { UsersModule } from '../users/users.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [UsersModule, SettingsModule],
  controllers: [AdminUsersController],
})
export class AdminModule {}
