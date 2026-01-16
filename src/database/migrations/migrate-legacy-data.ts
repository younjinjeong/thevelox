import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { User, UserSchema, UserDocument } from '../../modules/users/schemas/user.schema';
import { Box, BoxSchema, BoxDocument } from '../../modules/boxes/schemas/box.schema';
import { StorageObject, StorageObjectSchema, FileDocument } from '../../modules/files/schemas/file.schema';
import configuration from '../../config/configuration';
import { configValidationSchema } from '../../config/validation';

/**
 * Migration Service for Legacy Velox Data
 * Migrates data from old schema to new modernized schema
 */
class LegacyMigrationService {
  private readonly logger = new Logger(LegacyMigrationService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Box.name) private boxModel: Model<BoxDocument>,
    @InjectModel(StorageObject.name) private fileModel: Model<FileDocument>,
  ) {}

  /**
   * Migrate all legacy data
   */
  async migrateAll() {
    this.logger.log('Starting full migration...');

    await this.migrateUsers();
    await this.migrateBoxes();
    await this.migrateFiles();

    this.logger.log('✅ Full migration completed!');
  }

  /**
   * Migrate users from legacy schema
   */
  async migrateUsers() {
    this.logger.log('Migrating users...');

    try {
      // Find all users in the collection
      const users = await this.userModel.find({}).exec();

      let migrated = 0;
      let skipped = 0;

      for (const user of users) {
        try {
          // Check if user needs migration
          if (!user.roles || user.roles.length === 0) {
            // Add default role if missing
            user.roles = ['user'];
          }

          // Ensure notifications object exists
          if (!user.notifications) {
            user.notifications = {
              received: true,
              sent: true,
              note: true,
              nospace: true,
              invited: true,
              expired: true,
            };
          }

          // Ensure preference object exists
          if (!user.preference) {
            user.preference = {
              theme: 'light',
              viewtype: 'grid',
              conflict: 'rename',
              layout: 'default',
              dispname: 'name',
              timezone: 'UTC',
            };
          }

          // Ensure usedSize is set
          if (user.usedSize === undefined || user.usedSize === null) {
            user.usedSize = 0;
          }

          await user.save();
          migrated++;
        } catch (error) {
          this.logger.error(`Failed to migrate user ${user._id}: ${error.message}`);
          skipped++;
        }
      }

      this.logger.log(`Users: ${migrated} migrated, ${skipped} skipped`);
    } catch (error) {
      this.logger.error(`User migration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Migrate boxes from legacy schema
   */
  async migrateBoxes() {
    this.logger.log('Migrating boxes...');

    try {
      const boxes = await this.boxModel.find({}).exec();

      let migrated = 0;
      let skipped = 0;

      for (const box of boxes) {
        try {
          // Migrate Swift config to storage provider abstraction
          if (box.swift && box.swift.container && !box.storageProvider) {
            box.storageProvider = 'swift';
            box.storageContainerName = box.swift.container.name;
          }

          // Ensure required fields exist
          if (!box.createDate) {
            box.createDate = new Date();
          }

          if (!box.lastModifyDate) {
            box.lastModifyDate = box.createDate || new Date();
          }

          // Migrate type if needed (handle old numeric types)
          if (box.type === undefined || box.type === null) {
            box.type = 4; // Default to private
          }

          // Ensure status is set
          if (box.status === undefined || box.status === null) {
            box.status = 1; // Default to active
          }

          // Initialize size and fileLength if missing
          if (box.size === undefined || box.size === null) {
            box.size = 0;
          }

          if (box.fileLength === undefined || box.fileLength === null) {
            box.fileLength = 0;
          }

          await box.save();
          migrated++;
        } catch (error) {
          this.logger.error(`Failed to migrate box ${box._id}: ${error.message}`);
          skipped++;
        }
      }

      this.logger.log(`Boxes: ${migrated} migrated, ${skipped} skipped`);
    } catch (error) {
      this.logger.error(`Box migration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Migrate files (storage objects) from legacy schema
   */
  async migrateFiles() {
    this.logger.log('Migrating files...');

    try {
      const files = await this.fileModel.find({}).exec();

      let migrated = 0;
      let skipped = 0;

      for (const file of files) {
        try {
          // Ensure required fields exist
          if (!file.uploadDate) {
            file.uploadDate = new Date();
          }

          if (!file.lastModifyDate) {
            file.lastModifyDate = file.uploadDate || new Date();
          }

          // Ensure status is set
          if (file.status === undefined || file.status === null) {
            file.status = 1; // Default to active
          }

          // Ensure type is set
          if (file.type === undefined || file.type === null) {
            file.type = 1; // Default to member insert
          }

          // Initialize tags if missing
          if (!file.tags) {
            file.tags = [];
          }

          if (file.tagsSize === undefined || file.tagsSize === null) {
            file.tagsSize = file.tags.length;
          }

          // Initialize versions if missing
          if (!file.versions) {
            file.versions = [];
          }

          await file.save();
          migrated++;
        } catch (error) {
          this.logger.error(`Failed to migrate file ${file._id}: ${error.message}`);
          skipped++;
        }
      }

      this.logger.log(`Files: ${migrated} migrated, ${skipped} skipped`);
    } catch (error) {
      this.logger.error(`File migration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate migrated data
   */
  async validate() {
    this.logger.log('Validating migrated data...');

    const userCount = await this.userModel.countDocuments({});
    const boxCount = await this.boxModel.countDocuments({});
    const fileCount = await this.fileModel.countDocuments({});

    this.logger.log(`Database contains:`);
    this.logger.log(`- ${userCount} users`);
    this.logger.log(`- ${boxCount} boxes`);
    this.logger.log(`- ${fileCount} files`);

    // Check for users without required fields
    const invalidUsers = await this.userModel.countDocuments({ roles: { $exists: false } });
    if (invalidUsers > 0) {
      this.logger.warn(`⚠️  ${invalidUsers} users without roles`);
    }

    // Check for boxes without storage provider
    const invalidBoxes = await this.boxModel.countDocuments({ storageProvider: { $exists: false } });
    if (invalidBoxes > 0) {
      this.logger.warn(`⚠️  ${invalidBoxes} boxes without storage provider`);
    }

    this.logger.log('✅ Validation completed!');
  }
}

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
      { name: StorageObject.name, schema: StorageObjectSchema },
    ]),
  ],
  providers: [LegacyMigrationService],
})
class MigrationModule {}

async function bootstrap() {
  const logger = new Logger('Migration');

  const app = await NestFactory.createApplicationContext(MigrationModule, {
    logger: ['log', 'error', 'warn'],
  });

  const migrationService = app.get(LegacyMigrationService);

  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  try {
    logger.log(`Running migration: ${command}`);
    logger.log('============================================');

    switch (command) {
      case 'all':
        await migrationService.migrateAll();
        await migrationService.validate();
        break;

      case 'users':
        await migrationService.migrateUsers();
        break;

      case 'boxes':
        await migrationService.migrateBoxes();
        break;

      case 'files':
        await migrationService.migrateFiles();
        break;

      case 'validate':
        await migrationService.validate();
        break;

      default:
        logger.error(`Unknown command: ${command}`);
        logger.log('Available commands: all, users, boxes, files, validate');
        process.exit(1);
    }

    logger.log('============================================');
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
