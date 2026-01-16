import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { User, UserSchema } from '../../modules/users/schemas/user.schema';
import { Box, BoxSchema } from '../../modules/boxes/schemas/box.schema';
import { AdminUserSeeder } from './admin-user.seeder';
import { DemoDataSeeder } from './demo-data.seeder';
import configuration from '../../config/configuration';
import { configValidationSchema } from '../../config/validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Box.name, schema: BoxSchema },
    ]),
  ],
  providers: [AdminUserSeeder, DemoDataSeeder],
  exports: [AdminUserSeeder, DemoDataSeeder],
})
export class SeederModule {}
