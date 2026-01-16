import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../modules/users/schemas/user.schema';
import { Box, BoxDocument, BoxType, BoxStatus } from '../../modules/boxes/schemas/box.schema';

@Injectable()
export class DemoDataSeeder {
  private readonly logger = new Logger(DemoDataSeeder.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Box.name) private boxModel: Model<BoxDocument>,
  ) {}

  async seed() {
    try {
      // Check if demo data already exists
      const existingDemo = await this.userModel.findOne({ email: 'demo@velox.com' });

      if (existingDemo) {
        this.logger.log('Demo data already exists, skipping...');
        return;
      }

      // Create demo users
      const demoUsers = await this.createDemoUsers();
      this.logger.log(`Created ${demoUsers.length} demo users`);

      // Create demo boxes
      const demoBoxes = await this.createDemoBoxes(demoUsers);
      this.logger.log(`Created ${demoBoxes.length} demo boxes`);

      this.logger.log('Demo data seeded successfully');
    } catch (error: any) {
      this.logger.error(`Failed to seed demo data: ${error.message}`);
      throw error;
    }
  }

  async drop() {
    try {
      // Remove demo users
      await this.userModel.deleteMany({
        email: { $in: ['demo@velox.com', 'john@velox.com', 'jane@velox.com'] },
      });

      // Remove demo boxes
      await this.boxModel.deleteMany({
        name: { $regex: /^(Demo|Sample|Test)/ },
      });

      this.logger.log('Demo data removed');
    } catch (error: any) {
      this.logger.error(`Failed to remove demo data: ${error.message}`);
      throw error;
    }
  }

  private async createDemoUsers(): Promise<UserDocument[]> {
    const password = await bcrypt.hash('demo123', this.SALT_ROUNDS);

    const users = [
      {
        _id: 'demo_user_001',
        name: 'Demo User',
        username: 'demo',
        email: 'demo@velox.com',
        password,
        status: 1,
        roles: ['user'],
        availableSize: 10 * 1024 * 1024 * 1024, // 10GB
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
          timezone: 'America/New_York',
        },
      },
      {
        _id: 'demo_user_002',
        name: 'John Doe',
        username: 'john',
        email: 'john@velox.com',
        password,
        status: 1,
        roles: ['user'],
        availableSize: 5 * 1024 * 1024 * 1024, // 5GB
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
          theme: 'dark',
          viewtype: 'list',
          conflict: 'rename',
          layout: 'default',
          dispname: 'username',
          timezone: 'America/Los_Angeles',
        },
      },
      {
        _id: 'demo_user_003',
        name: 'Jane Smith',
        username: 'jane',
        email: 'jane@velox.com',
        password,
        status: 1,
        roles: ['user'],
        availableSize: 5 * 1024 * 1024 * 1024, // 5GB
        usedSize: 0,
        locale: 'en-US',
        notifications: {
          received: true,
          sent: false,
          note: true,
          nospace: true,
          invited: true,
          expired: false,
        },
        preference: {
          theme: 'light',
          viewtype: 'grid',
          conflict: 'version',
          layout: 'compact',
          dispname: 'name',
          timezone: 'Europe/London',
        },
      },
    ];

    const createdUsers: UserDocument[] = [];
    for (const userData of users) {
      const user = new this.userModel(userData);
      await user.save();
      createdUsers.push(user);
    }

    return createdUsers;
  }

  private async createDemoBoxes(users: UserDocument[]): Promise<BoxDocument[]> {
    const boxes = [
      {
        owner: users[0]._id,
        name: 'Demo Personal Box',
        description: 'Personal files and documents',
        type: BoxType.PRIVATE,
        status: BoxStatus.ACTIVE,
        members: [],
        tags: [
          { id: 'personal', name: 'Personal', count: 0 },
          { id: 'important', name: 'Important', count: 0 },
        ],
        storageProvider: 'swift',
        storageContainerName: `demo_box_${Date.now()}_1`,
      },
      {
        owner: users[0]._id,
        name: 'Sample Shared Project',
        description: 'A sample project shared with team members',
        type: BoxType.SHARE,
        status: BoxStatus.ACTIVE,
        members: [users[1]._id, users[2]._id],
        tags: [
          { id: 'project', name: 'Project', count: 0 },
          { id: 'team', name: 'Team', count: 0 },
        ],
        storageProvider: 'swift',
        storageContainerName: `demo_box_${Date.now()}_2`,
        linkInfo: {
          subject: 'Team Project Collaboration',
          message: 'Welcome to the team project!',
          isEnabled: true,
          recipient: ['john@velox.com', 'jane@velox.com'],
        },
      },
      {
        owner: users[1]._id,
        name: 'Test Public Box',
        description: 'Public box for testing',
        type: BoxType.PUBLIC_READ,
        status: BoxStatus.ACTIVE,
        members: [],
        tags: [
          { id: 'public', name: 'Public', count: 0 },
          { id: 'test', name: 'Test', count: 0 },
        ],
        storageProvider: 'swift',
        storageContainerName: `demo_box_${Date.now()}_3`,
      },
    ];

    const createdBoxes: BoxDocument[] = [];
    for (const boxData of boxes) {
      const box = new this.boxModel(boxData);
      await box.save();
      createdBoxes.push(box);
    }

    return createdBoxes;
  }
}
