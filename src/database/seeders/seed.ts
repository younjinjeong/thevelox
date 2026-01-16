import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SeederModule } from './seeder.module';
import { AdminUserSeeder } from './admin-user.seeder';
import { DemoDataSeeder } from './demo-data.seeder';

const logger = new Logger('Seeder');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeederModule, {
    logger: ['log', 'error', 'warn'],
  });

  const adminUserSeeder = app.get(AdminUserSeeder);
  const demoDataSeeder = app.get(DemoDataSeeder);

  const args = process.argv.slice(2);
  const command = args[0] || 'seed';

  try {
    logger.log(`Running database seeder: ${command}`);
    logger.log('============================================');

    switch (command) {
      case 'seed':
        logger.log('Seeding database with initial data...');
        await adminUserSeeder.seed();
        await demoDataSeeder.seed();
        logger.log('✅ Database seeded successfully!');
        break;

      case 'drop':
        logger.log('Dropping seeded data...');
        await demoDataSeeder.drop();
        await adminUserSeeder.drop();
        logger.log('✅ Seeded data dropped successfully!');
        break;

      case 'refresh':
        logger.log('Refreshing database (drop + seed)...');
        await demoDataSeeder.drop();
        await adminUserSeeder.drop();
        await adminUserSeeder.seed();
        await demoDataSeeder.seed();
        logger.log('✅ Database refreshed successfully!');
        break;

      case 'admin-only':
        logger.log('Seeding admin user only...');
        await adminUserSeeder.seed();
        logger.log('✅ Admin user seeded successfully!');
        break;

      default:
        logger.error(`Unknown command: ${command}`);
        logger.log('Available commands: seed, drop, refresh, admin-only');
        process.exit(1);
    }

    logger.log('============================================');
  } catch (error: any) {
    logger.error(`Seeder failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
