import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { TerminusModule } from '@nestjs/terminus';
import * as redisStore from 'cache-manager-redis-store';

import configuration from './config/configuration';
import { configValidationSchema } from './config/validation';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BoxesModule } from './modules/boxes/boxes.module';
// import { FilesModule } from './modules/files/files.module';
import { StorageModule } from './modules/storage/storage.module';
// import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Database
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI,
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRoot({
      ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
      limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    }),

    // Caching
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        store: redisStore,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        ttl: 300, // 5 minutes default
      }),
    }),

    // Health checks
    TerminusModule,

    // Feature modules
    AuthModule,
    UsersModule,
    BoxesModule,
    // FilesModule,
    StorageModule,
    // RealtimeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
