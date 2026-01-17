import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../modules/users/schemas/user.schema';

@Injectable()
export class AdminUserSeeder {
  private readonly logger = new Logger(AdminUserSeeder.name);
  private readonly SALT_ROUNDS = 12;

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async seed() {
    try {
      // Check if admin user already exists
      const existingAdmin = await this.userModel.findOne({ email: 'admin@velox.local' });

      if (existingAdmin) {
        this.logger.log('Admin user already exists, skipping...');
        return;
      }

      // Create admin user
      const hashedPassword = await bcrypt.hash('adminpass', this.SALT_ROUNDS);

      const adminUser = new this.userModel({
        _id: 'admin_user_001',
        name: 'Administrator',
        username: 'admin',
        email: 'admin@velox.local',
        password: hashedPassword,
        status: 1,
        roles: ['admin', 'user'],
        availableSize: 1024 * 1024 * 1024 * 1024, // 1TB
        usedSize: 0,
        locale: 'en-US',
        notifications: {
          received: true,
          sent: true,
          note: true,
          nospace: true,
          invited: true,
          expired: true,
        },
        preference: {
          theme: 'light',
          viewtype: 'grid',
          conflict: 'rename',
          layout: 'default',
          dispname: 'name',
          timezone: 'UTC',
        },
      });

      await adminUser.save();

      this.logger.log('Admin user created successfully');
      this.logger.log('Email: admin@velox.local');
      this.logger.log('Password: adminpass');
      this.logger.log('⚠️  Please change the default password after first login!');
    } catch (error: any) {
      this.logger.error(`Failed to seed admin user: ${error.message}`);
      throw error;
    }
  }

  async drop() {
    try {
      await this.userModel.deleteOne({ email: 'admin@velox.local' });
      this.logger.log('Admin user removed');
    } catch (error: any) {
      this.logger.error(`Failed to remove admin user: ${error.message}`);
      throw error;
    }
  }
}
